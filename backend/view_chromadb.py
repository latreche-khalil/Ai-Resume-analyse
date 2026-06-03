"""
ChromaDB Viewer — Generates a rich HTML dashboard showing all collections and embeddings.
Run: python view_chromadb.py
Then open chromadb_viewer.html in your browser.
"""
import json
import urllib.request
import urllib.error
import os
from datetime import datetime

CHROMA_HOST = "http://localhost:8001"
local_client = None


def api_get(path):
    """Simple HTTP GET to ChromaDB REST API."""
    url = f"{CHROMA_HOST}{path}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError:
        return None
    except Exception:
        return None


def api_post(path, data):
    """Simple HTTP POST to ChromaDB REST API."""
    url = f"{CHROMA_HOST}{path}"
    try:
        payload = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def fetch_collections():
    """Fetch all ChromaDB collections with their documents."""
    global local_client
    if local_client is not None:
        try:
            cols = local_client.list_collections()
            collections_data = []
            for col in cols:
                collections_data.append({
                    "id": str(col.id),
                    "name": col.name,
                    "metadata": col.metadata
                })
            return collections_data, True
        except Exception as e:
            print(f"  [ERROR] Local database read error: {e}")
            return None, False

    result = api_get("/api/v2/collections")
    if result is None:
        result = api_get("/api/v1/collections")
    if result is None:
        return None, False
    return result, True


def fetch_collection_docs(col_id, col_name, limit=500):
    """Fetch documents from a collection (try v2 then v1)."""
    global local_client
    if local_client is not None:
        try:
            col = local_client.get_collection(col_name)
            return col.get(limit=limit, include=["documents", "metadatas", "embeddings"])
        except Exception as e:
            print(f"  [ERROR] Local collection read error: {e}")
            return None

    body = {
        "limit": limit,
        "include": ["documents", "metadatas", "embeddings"]
    }

    data = api_post(f"/api/v2/collections/{col_id}/get", body)
    if data is None:
        data = api_post(f"/api/v1/collections/{col_id}/get", body)
    if data is None:
        data = api_post(f"/api/v1/collections/{col_name}/get", body)
    return data


def generate_html(collections_data, server_reachable, status_text="Connected", host_text="http://localhost:8001"):
    """Generate the interactive HTML viewer."""
    import sqlite3

    # Fetch mapping of doc_id -> original_filename and created_at from SQLite
    db_mapping = {}
    for path in ['ai_resume.db', '../ai_resume.db']:
        if os.path.exists(path):
            try:
                conn = sqlite3.connect(path)
                cursor = conn.cursor()
                cursor.execute("SELECT id, original_filename, created_at FROM cv_documents")
                for row in cursor.fetchall():
                    db_mapping[str(row[0])] = {
                        "filename": row[1],
                        "created_at": row[2]
                    }
                conn.close()
                break
            except Exception as e:
                print(f"  [WARNING] Could not read {path} for CV mapping: {e}")

    js_collections = []

    for col in (collections_data or []):
        col_id = col.get("id", col.get("name", "unknown"))
        col_name = col.get("name", col_id)
        col_meta = col.get("metadata", {}) or {}

        docs_data = fetch_collection_docs(col_id, col_name, limit=500)

        ids = []
        documents = []
        metadatas = []
        embeddings_preview = []
        embedding_dims = []

        if docs_data:
            ids = docs_data.get("ids", [])
            documents = docs_data.get("documents", [])
            metadatas = docs_data.get("metadatas", []) or []
            raw_embs = docs_data.get("embeddings")
            if raw_embs is not None and len(raw_embs) > 0:
                for emb in raw_embs:
                    if emb is not None and len(emb) > 0:
                        preview = [round(float(x), 4) for x in emb[:8]]
                        embeddings_preview.append(preview)
                        embedding_dims.append(len(emb))
                    else:
                        embeddings_preview.append([])
                        embedding_dims.append(0)
            else:
                embeddings_preview = [[]] * len(ids)
                embedding_dims = [0] * len(ids)

        rows = []
        for i, doc_id in enumerate(ids):
            meta = metadatas[i] if i < len(metadatas) else {}
            emb_preview = embeddings_preview[i] if i < len(embeddings_preview) else []
            emb_dim = embedding_dims[i] if i < len(embedding_dims) else 0
            doc_text = (documents[i] if i < len(documents) else "") or ""
            
            # Lookup document name and created_at
            did = meta.get("document_id") or meta.get("doc_id") or meta.get("source")
            doc_info = db_mapping.get(str(did), {}) if did else {}
            doc_name = doc_info.get("filename", "")
            doc_created_at = doc_info.get("created_at", "")
            if not doc_name and doc_id:
                if "_" in doc_id:
                    base_id = doc_id.split("_")[0]
                    doc_info = db_mapping.get(base_id, {})
                    doc_name = doc_info.get("filename", "")
                    doc_created_at = doc_info.get("created_at", "")
                    
            rows.append({
                "id": doc_id,
                "document": doc_text,
                "word_count": len(doc_text.split()),
                "char_count": len(doc_text),
                "metadata": meta,
                "embedding_preview": emb_preview,
                "embedding_dim": emb_dim,
                "doc_name": doc_name,
                "doc_created_at": doc_created_at
            })

        # Compute collection-level stats
        avg_dim = int(sum(embedding_dims) / len(embedding_dims)) if embedding_dims else 0
        langs = {}
        chunk_indices = []
        doc_ids_set = set()
        for r in rows:
            m = r["metadata"] or {}
            lang = m.get("language") or m.get("lang") or m.get("detected_language") or "unknown"
            langs[lang] = langs.get(lang, 0) + 1
            ci = m.get("chunk_index") or m.get("chunk") or m.get("index")
            if ci is not None:
                try:
                    chunk_indices.append(int(ci))
                except Exception:
                    pass
            did = m.get("document_id") or m.get("doc_id") or m.get("source")
            if did:
                doc_ids_set.add(str(did))

        js_collections.append({
            "id": col_id,
            "name": col_name,
            "metadata": col_meta,
            "count": len(ids),
            "avg_dim": avg_dim,
            "languages": langs,
            "unique_docs": len(doc_ids_set),
            "max_chunk": max(chunk_indices) if chunk_indices else 0,
            "rows": rows
        })

    db_json = json.dumps(js_collections, ensure_ascii=False)
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChromaDB Viewer — AI Resume Analyzer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  :root {{
    --bg: #f8fafc;
    --bg-card: #ffffff;
    --bg-card2: #f1f5f9;
    --bg-card3: #e2e8f0;
    --border: #e2e8f0;
    --border2: #cbd5e1;
    --text: #0f172a;
    --text2: #475569;
    --text3: #64748b;
    --accent: #6d28d9;
    --accent2: #7c3aed;
    --accent-light: #8b5cf615;
    --green: #059669;
    --green-bg: #d1fae5;
    --red: #dc2626;
    --red-bg: #fee2e2;
    --yellow: #b45309;
    --yellow-bg: #fef3c7;
    --blue: #2563eb;
    --blue-bg: #dbeafe;
    --purple: #7c3aed;
    --purple-bg: #ede9fe;
    --teal: #0d9488;
    --teal-bg: #ccfbf1;
  }}
  body {{ font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }}
  ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
  ::-webkit-scrollbar-track {{ background: var(--bg); }}
  ::-webkit-scrollbar-thumb {{ background: var(--border2); border-radius: 3px; }}

  /* ---- Header ---- */
  header {{
    background: var(--bg-card); border-bottom: 1px solid var(--border);
    padding: 12px 20px; display: flex; align-items: center; gap: 12px;
    position: sticky; top: 0; z-index: 100;
  }}
  .logo {{
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, #6d28d9 0%, #a855f7 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; color: white;
    box-shadow: 0 0 16px #7c3aed35; flex-shrink: 0;
  }}
  header h1 {{ font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; flex: 1; }}
  header p {{ font-size: 11px; color: var(--text3); }}
  .badge {{
    font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 600;
    border: 1px solid; white-space: nowrap;
  }}
  .badge-green {{ color: var(--green); border-color: #05966930; background: var(--green-bg); }}
  .badge-red {{ color: var(--red); border-color: #dc262630; background: var(--red-bg); }}
  .badge-gray {{ color: var(--text2); border-color: var(--border); background: var(--bg-card2); }}
  .badge-purple {{ color: var(--purple); border-color: #7c3aed30; background: var(--purple-bg); }}
  .badge-blue {{ color: var(--blue); border-color: #2563eb30; background: var(--blue-bg); }}
  .badge-yellow {{ color: var(--yellow); border-color: #b4530930; background: var(--yellow-bg); }}
  .badge-teal {{ color: var(--teal); border-color: #0d948830; background: var(--teal-bg); }}

  /* ---- Layout ---- */
  .layout {{ display: flex; height: calc(100vh - 61px); overflow: hidden; }}

  /* ---- Sidebar ---- */
  aside {{
    width: 240px; border-right: 1px solid var(--border);
    background: var(--bg-card); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;
  }}
  .sidebar-section {{ padding: 10px 12px 6px; border-bottom: 1px solid var(--border); }}
  .sidebar-section h3 {{ font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); }}
  .sidebar-nav {{ flex: 1; overflow-y: auto; padding: 6px; }}
  .col-btn {{
    width: 100%; text-align: left; background: none; border: none; cursor: pointer;
    padding: 9px 10px; border-radius: 8px; color: var(--text2); font-family: inherit;
    font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;
    transition: all 0.15s; margin-bottom: 2px;
  }}
  .col-btn:hover {{ background: var(--bg-card2); color: var(--text); }}
  .col-btn.active {{ background: var(--accent-light); color: var(--accent2); border-left: 3px solid var(--accent2); padding-left: 7px; }}
  .col-icon {{ font-size: 14px; flex-shrink: 0; }}
  .col-name {{ flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
  .col-count {{
    font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 10px;
    background: var(--bg-card2); color: var(--text3); flex-shrink: 0;
  }}
  .col-btn.active .col-count {{ background: #7c3aed25; color: var(--accent2); }}

  /* ---- Main ---- */
  main {{ flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }}

  /* Stats bar */
  .stats-bar {{
    display: flex; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border);
    background: var(--bg-card); flex-shrink: 0; flex-wrap: wrap; align-items: center;
  }}
  .stat-card {{
    display: flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--bg); font-size: 12px;
  }}
  .stat-icon {{ font-size: 14px; }}
  .stat-val {{ font-weight: 700; color: var(--text); }}
  .stat-lbl {{ color: var(--text3); font-size: 11px; }}

  /* Toolbar */
  .toolbar {{
    padding: 10px 16px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    background: var(--bg-card2); flex-wrap: wrap;
  }}
  .toolbar h2 {{ font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; flex: 1; min-width: 100px; }}
  .search-box {{
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
    padding: 6px 11px; color: var(--text); font-family: inherit; font-size: 12px;
    width: 200px; outline: none; transition: border-color 0.15s;
  }}
  .search-box:focus {{ border-color: var(--accent2); }}
  .search-box::placeholder {{ color: var(--text3); }}
  .filter-select {{
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
    padding: 6px 10px; color: var(--text2); font-family: inherit; font-size: 12px;
    outline: none; cursor: pointer; transition: border-color 0.15s;
  }}
  .filter-select:focus {{ border-color: var(--accent2); }}
  .btn {{
    padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text2); font-family: inherit; font-size: 12px;
    font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap;
    display: flex; align-items: center; gap: 5px;
  }}
  .btn:hover {{ background: var(--bg-card3); color: var(--text); border-color: var(--border2); }}
  .btn-purple {{ background: var(--purple-bg); color: var(--purple); border-color: #7c3aed25; }}
  .btn-purple:hover {{ background: #ddd6fe; }}
  .btn-active {{ background: var(--accent-light) !important; color: var(--accent2) !important; border-color: #7c3aed40 !important; }}

  /* Table */
  .table-wrap {{ flex: 1; overflow: auto; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
  thead {{ position: sticky; top: 0; z-index: 10; }}
  thead th {{
    padding: 8px 12px; background: var(--bg-card2); border-bottom: 2px solid var(--border);
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text3); white-space: nowrap; text-align: left; cursor: pointer;
    user-select: none;
  }}
  thead th:hover {{ color: var(--text2); }}
  thead th.sort-asc::after {{ content: ' ↑'; color: var(--accent2); }}
  thead th.sort-desc::after {{ content: ' ↓'; color: var(--accent2); }}
  tbody tr {{ border-bottom: 1px solid var(--border); transition: background 0.1s; cursor: pointer; }}
  tbody tr:hover {{ background: var(--bg-card2); }}
  tbody td {{ padding: 9px 12px; vertical-align: middle; }}
  .cell-idx {{ color: var(--text3); text-align: center; font-size: 11px; width: 40px; }}
  .cell-id {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent2); max-width: 200px; }}
  .cell-doc {{ color: var(--text); line-height: 1.4; max-width: 300px; }}
  .cell-doc span {{ display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
  .cell-meta {{ max-width: 200px; }}
  .cell-emb {{ max-width: 160px; }}
  .mini-bar {{ display: flex; align-items: flex-end; gap: 2px; height: 20px; }}
  .mini-bar-item {{ width: 8px; border-radius: 2px 2px 0 0; background: var(--accent2); opacity: 0.6; min-height: 2px; }}
  .more-tag {{ color: var(--accent2); font-size: 10px; font-weight: 600; }}
  .wc-tag {{ font-size: 10px; color: var(--text3); margin-top: 2px; }}
  .chunk-badge {{
    display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 6px;
    background: var(--purple-bg); color: var(--purple); border: 1px solid #7c3aed20;
    font-family: 'JetBrains Mono', monospace;
  }}
  .lang-badge {{
    display: inline-block; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 6px;
  }}
  .lang-ar {{ background: var(--yellow-bg); color: var(--yellow); }}
  .lang-en {{ background: var(--blue-bg); color: var(--blue); }}
  .lang-fr {{ background: var(--teal-bg); color: var(--teal); }}
  .lang-un {{ background: var(--bg-card2); color: var(--text3); }}
  .meta-pill {{
    display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 5px;
    background: var(--bg-card2); color: var(--text3); border: 1px solid var(--border);
    font-family: 'JetBrains Mono', monospace; margin: 1px; white-space: nowrap;
  }}

  /* Grouped view */
  .group-header {{
    padding: 8px 12px; background: var(--bg-card2); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    font-size: 12px; font-weight: 600; color: var(--text2);
    position: sticky; top: 0; z-index: 5;
  }}
  .group-header:hover {{ background: var(--bg-card3); }}
  .group-toggle {{ font-size: 10px; transition: transform 0.2s; }}
  .group-toggle.open {{ transform: rotate(90deg); }}
  .group-rows {{ display: none; }}
  .group-rows.open {{ display: table-row-group; }}

  /* Empty / Offline */
  .empty-state {{
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; gap: 10px; color: var(--text3); text-align: center; padding: 40px;
  }}
  .empty-icon {{ font-size: 48px; opacity: 0.35; }}
  .empty-title {{ font-size: 16px; font-weight: 600; color: var(--text2); }}
  .empty-sub {{ font-size: 12px; }}

  /* Footer */
  .footer {{
    padding: 7px 16px; border-top: 1px solid var(--border); font-size: 11px;
    color: var(--text3); display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    background: var(--bg-card2);
  }}
  .footer-dot {{ opacity: 0.4; }}

  /* Modal */
  .modal-overlay {{
    position: fixed; inset: 0; background: #00000035; backdrop-filter: blur(4px);
    z-index: 200; display: none; align-items: center; justify-content: center; padding: 20px;
  }}
  .modal-overlay.open {{ display: flex; }}
  .modal {{
    background: var(--bg-card); border: 1px solid var(--border2); border-radius: 16px;
    width: 100%; max-width: 820px; max-height: 88vh; display: flex; flex-direction: column;
    box-shadow: 0 20px 60px #00000018;
  }}
  .modal-head {{
    padding: 16px 18px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }}
  .modal-head h3 {{ font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; flex: 1; }}
  .modal-close {{
    background: var(--bg-card2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text2); cursor: pointer; font-size: 17px; width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }}
  .modal-close:hover {{ background: var(--border); color: var(--text); }}
  .modal-tabs {{ display: flex; gap: 2px; padding: 10px 18px 0; border-bottom: 1px solid var(--border); }}
  .modal-tab {{
    padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
    border-radius: 8px 8px 0 0; color: var(--text3); border: 1px solid transparent;
    border-bottom: none; transition: all 0.15s; background: none;
    font-family: inherit;
  }}
  .modal-tab.active {{ background: var(--bg-card); color: var(--accent2); border-color: var(--border); margin-bottom: -1px; }}
  .modal-tab:hover:not(.active) {{ background: var(--bg-card2); color: var(--text2); }}
  .modal-body {{ padding: 16px 18px; overflow-y: auto; flex: 1; }}
  .tab-panel {{ display: none; }}
  .tab-panel.active {{ display: block; }}
  .field-label {{
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text3); margin-bottom: 5px; margin-top: 12px;
    display: flex; align-items: center; justify-content: space-between;
  }}
  .field-label:first-child {{ margin-top: 0; }}
  .field-value {{
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: var(--text); white-space: pre-wrap; word-break: break-word;
    max-height: 200px; overflow-y: auto; line-height: 1.6;
  }}
  .field-value.doc {{ font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; max-height: 260px; }}
  .field-value.emb {{ color: var(--text3); font-size: 10px; max-height: 150px; }}
  .field-value.meta {{ color: var(--yellow); max-height: 200px; }}
  .copy-btn {{
    font-size: 10px; padding: 2px 8px; border-radius: 5px; border: 1px solid var(--border);
    background: var(--bg-card2); color: var(--text3); cursor: pointer; font-family: inherit;
    font-weight: 600; transition: all 0.15s;
  }}
  .copy-btn:hover {{ background: var(--border); color: var(--text); }}
  .copy-btn.copied {{ background: var(--green-bg); color: var(--green); border-color: #05966930; }}

  /* Embedding chart */
  .emb-chart {{
    display: flex; align-items: flex-end; gap: 2px; height: 60px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 8px 10px; overflow: hidden;
  }}
  .emb-bar {{
    flex: 1; border-radius: 2px 2px 0 0; min-width: 3px; min-height: 2px;
    transition: opacity 0.15s;
  }}
  .emb-bar:hover {{ opacity: 0.8; }}
  .emb-pos {{ background: var(--accent2); }}
  .emb-neg {{ background: var(--red); }}

  /* Grid for modal stats */
  .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }}
  .info-item {{
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 12px;
  }}
  .info-item .lbl {{ font-size: 10px; color: var(--text3); margin-bottom: 3px; }}
  .info-item .val {{ font-size: 14px; font-weight: 700; color: var(--text); font-family: 'Outfit', sans-serif; }}

  /* Toast */
  .toast {{
    position: fixed; bottom: 24px; right: 24px; background: var(--text); color: white;
    padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 600;
    z-index: 999; opacity: 0; transform: translateY(8px); transition: all 0.25s;
    pointer-events: none;
  }}
  .toast.show {{ opacity: 1; transform: translateY(0); }}
</style>
</head>
<body>

<header>
  <div class="logo">C<span style="font-size:10px">DB</span></div>
  <div style="flex:1">
    <h1>ChromaDB Viewer</h1>
    <p>Vector Database — AI Resume Analyzer &nbsp;·&nbsp; Generated: {generated_at}</p>
  </div>
  <span class="badge {'badge-green' if server_reachable else 'badge-red'}">{status_text}</span>
  <span class="badge badge-purple">{host_text}</span>
</header>

<div class="layout">
  <aside>
    <div class="sidebar-section"><h3>Collections ({len(js_collections)})</h3></div>
    <nav class="sidebar-nav" id="sidebar-nav"></nav>
  </aside>

  <main>
    <!-- Stats bar -->
    <div class="stats-bar" id="stats-bar" style="display:none">
      <div class="stat-card"><span class="stat-icon">📄</span><span class="stat-val" id="s-docs">0</span><span class="stat-lbl">chunks</span></div>
      <div class="stat-card"><span class="stat-icon">🗃️</span><span class="stat-val" id="s-unique">0</span><span class="stat-lbl">documents</span></div>
      <div class="stat-card"><span class="stat-icon">🧮</span><span class="stat-val" id="s-dim">0</span><span class="stat-lbl">dimensions</span></div>
      <div class="stat-card"><span class="stat-icon">🔤</span><span class="stat-val" id="s-lang">—</span><span class="stat-lbl">top lang</span></div>
      <div class="stat-card"><span class="stat-icon">📝</span><span class="stat-val" id="s-chunks">0</span><span class="stat-lbl">max chunk #</span></div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <h2 id="col-title">Select a Collection</h2>
      <input id="search" class="search-box" placeholder="🔍 Search text, ID, metadata..." oninput="filterDocs()">
      <select id="lang-filter" class="filter-select" onchange="filterDocs()">
        <option value="">All languages</option>
      </select>
      <select id="chunk-filter" class="filter-select" onchange="filterDocs()">
        <option value="">All chunks</option>
      </select>
      <button id="group-btn" class="btn btn-active" onclick="toggleGroupView()">📋 Flat View</button>
      <button class="btn btn-purple" onclick="exportJSON()">📤 Export JSON</button>
      <span class="badge badge-gray" id="count-badge">0 docs</span>
    </div>

    <div class="table-wrap" id="table-wrap">
      <div class="empty-state">
        <div class="empty-icon">🧠</div>
        <div class="empty-title">ChromaDB Vector Database</div>
        <div class="empty-sub">Select a collection from the sidebar to browse embeddings and documents.</div>
      </div>
    </div>
    <div class="footer" id="footer">
      Ready &nbsp;<span class="footer-dot">·</span>&nbsp; ChromaDB REST API &nbsp;<span class="footer-dot">·</span>&nbsp; Port 8001
    </div>
  </main>
</div>

<!-- Row Detail Modal -->
<div class="modal-overlay" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <div class="modal-head">
      <h3 id="modal-title">Document Detail</h3>
      <span id="modal-lang-badge"></span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab active" id="tab-btn-text" onclick="switchTab('text')">📄 Document</button>
      <button class="modal-tab" id="tab-btn-meta" onclick="switchTab('meta')">🏷️ Metadata</button>
      <button class="modal-tab" id="tab-btn-emb" onclick="switchTab('emb')">🧮 Embedding</button>
      <button class="modal-tab" id="tab-btn-info" onclick="switchTab('info')">ℹ️ Info</button>
    </div>
    <div class="modal-body">
      <div class="tab-panel active" id="tab-text">
        <div class="field-label">📄 Full Document Text <button class="copy-btn" id="copy-doc-btn" onclick="copyField('doc')">Copy</button></div>
        <div class="field-value doc" id="modal-doc"></div>
      </div>
      <div class="tab-panel" id="tab-meta">
        <div class="field-label">🏷️ Metadata (JSON) <button class="copy-btn" id="copy-meta-btn" onclick="copyField('meta')">Copy</button></div>
        <div class="field-value meta" id="modal-meta"></div>
      </div>
      <div class="tab-panel" id="tab-emb">
        <div class="field-label">🧮 Embedding Visualization (first 64 dims)</div>
        <div class="emb-chart" id="modal-emb-chart"></div>
        <div class="field-label" style="margin-top:12px">Raw Values (first 16) <button class="copy-btn" id="copy-emb-btn" onclick="copyField('emb')">Copy</button></div>
        <div class="field-value emb" id="modal-emb"></div>
      </div>
      <div class="tab-panel" id="tab-info">
        <div class="info-grid" id="modal-info-grid"></div>
        <div class="field-label" style="margin-top:14px">🆔 Document ID <button class="copy-btn" id="copy-id-btn" onclick="copyField('id')">Copy</button></div>
        <div class="field-value" id="modal-id"></div>
      </div>
    </div>
  </div>
</div>

<!-- Toast notification -->
<div class="toast" id="toast">Copied!</div>

<script>
const DB = {db_json};
let currentCol = null;
let filteredRows = [];
let groupView = true;
let currentRow = null;
let currentTabId = 'text';

// ---- Sidebar ----
function buildSidebar() {{
  const nav = document.getElementById('sidebar-nav');
  if (!DB.length) {{
    nav.innerHTML = '<div style="padding:16px;font-size:12px;color:#71717a;text-align:center">No collections found.<br>Is ChromaDB running?</div>';
    return;
  }}
  DB.forEach((col, i) => {{
    const btn = document.createElement('button');
    btn.className = 'col-btn';
    btn.id = 'btn-' + i;
    btn.onclick = () => selectCol(i);
    btn.innerHTML = `
      <span class="col-icon">🗄️</span>
      <span class="col-name">${{col.name}}</span>
      <span class="col-count">${{col.count}}</span>
    `;
    nav.appendChild(btn);
  }});
}}

function selectCol(idx) {{
  document.querySelectorAll('.col-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + idx);
  if (btn) btn.classList.add('active');
  currentCol = idx;
  const col = DB[idx];

  // Update stats bar
  document.getElementById('stats-bar').style.display = 'flex';
  document.getElementById('s-docs').textContent = col.count;
  document.getElementById('s-unique').textContent = col.unique_docs || '—';
  document.getElementById('s-dim').textContent = col.avg_dim || '—';
  document.getElementById('s-chunks').textContent = col.max_chunk || '—';
  const langs = col.languages || {{}};
  const topLang = Object.entries(langs).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('s-lang').textContent = topLang ? topLang[0] : '—';

  // Populate filters
  const langSel = document.getElementById('lang-filter');
  langSel.innerHTML = '<option value="">All languages</option>';
  Object.keys(langs).forEach(l => {{
    const opt = document.createElement('option');
    opt.value = l; opt.textContent = l + ' (' + langs[l] + ')';
    langSel.appendChild(opt);
  }});

  const chunkSel = document.getElementById('chunk-filter');
  chunkSel.innerHTML = '<option value="">All chunks</option>';
  const chunkIdxSet = new Set();
  col.rows.forEach(r => {{
    const ci = r.metadata && (r.metadata.chunk_index ?? r.metadata.chunk ?? r.metadata.index);
    if (ci !== undefined && ci !== null) chunkIdxSet.add(ci);
  }});
  [...chunkIdxSet].sort((a,b)=>a-b).forEach(ci => {{
    const opt = document.createElement('option');
    opt.value = ci; opt.textContent = 'Chunk #' + ci;
    chunkSel.appendChild(opt);
  }});

  document.getElementById('search').value = '';
  document.getElementById('col-title').textContent = col.name;
  filteredRows = [...col.rows];

  // Set group button initial state
  const gBtn = document.getElementById('group-btn');
  if (groupView) {{
    gBtn.classList.add('btn-active');
    gBtn.textContent = '📋 Flat View';
  }} else {{
    gBtn.classList.remove('btn-active');
    gBtn.textContent = '🗂️ Group by Doc';
  }}

  renderView();
}}

// ---- Filters ----
function filterDocs() {{
  if (currentCol === null) return;
  const q = document.getElementById('search').value.toLowerCase().trim();
  const langF = document.getElementById('lang-filter').value;
  const chunkF = document.getElementById('chunk-filter').value;

  filteredRows = DB[currentCol].rows.filter(r => {{
    const meta = r.metadata || {{}};
    const lang = meta.language || meta.lang || meta.detected_language || 'unknown';
    const ci = meta.chunk_index ?? meta.chunk ?? meta.index;

    if (langF && lang !== langF) return false;
    if (chunkF !== '' && String(ci) !== String(chunkF)) return false;
    if (q) {{
      return (r.document && r.document.toLowerCase().includes(q)) ||
             (r.id && r.id.toLowerCase().includes(q)) ||
             (r.doc_name && r.doc_name.toLowerCase().includes(q)) ||
             JSON.stringify(meta).toLowerCase().includes(q);
    }}
    return true;
  }});
  renderView();
}}

// ---- Group Toggle ----
function toggleGroupView() {{
  groupView = !groupView;
  const btn = document.getElementById('group-btn');
  if (groupView) {{
    btn.classList.add('btn-active');
    btn.textContent = '📋 Flat View';
  }} else {{
    btn.classList.remove('btn-active');
    btn.textContent = '🗂️ Group by Doc';
  }}
  renderView();
}}

// ---- Render ----
function renderView() {{
  // Sort filteredRows by doc_created_at DESC, then by chunk_index ASC
  filteredRows.sort((a, b) => {{
    const dateA = a.doc_created_at || '';
    const dateB = b.doc_created_at || '';
    if (dateA !== dateB) {{
      return dateB.localeCompare(dateA);
    }}
    const idxA = a.metadata?.chunk_index ?? a.metadata?.chunk ?? a.metadata?.index ?? 0;
    const idxB = b.metadata?.chunk_index ?? b.metadata?.chunk ?? b.metadata?.index ?? 0;
    return idxA - idxB;
  }});

  updateFooter();
  if (groupView) renderGrouped();
  else renderFlat();
}}

function updateFooter() {{
  document.getElementById('count-badge').textContent = filteredRows.length + ' chunks';
  document.getElementById('footer').innerHTML = `
    Showing <strong>${{filteredRows.length}}</strong> chunks
    <span class="footer-dot">·</span> Collection: <strong>${{DB[currentCol].name}}</strong>
    <span class="footer-dot">·</span> ${{DB[currentCol].avg_dim}}d embeddings
    <span class="footer-dot">·</span> ChromaDB REST API
  `;
}}

function getLangClass(lang) {{
  if (!lang) return 'lang-un';
  const l = lang.toLowerCase();
  if (l === 'ar' || l === 'arabic') return 'lang-ar';
  if (l === 'en' || l === 'english') return 'lang-en';
  if (l === 'fr' || l === 'french') return 'lang-fr';
  return 'lang-un';
}}

function renderFlat() {{
  const wrap = document.getElementById('table-wrap');
  if (!filteredRows.length) {{
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No chunks found</div><div class="empty-sub">Try adjusting your search or filters.</div></div>';
    return;
  }}

  let html = `<table><thead><tr>
    <th class="cell-idx">#</th>
    <th>ID</th>
    <th>CV Name / Document Preview</th>
    <th>Chunk / Lang</th>
    <th>Metadata</th>
    <th>Embedding</th>
  </tr></thead><tbody>`;

  filteredRows.forEach((row, i) => {{
    const meta = row.metadata || {{}};
    const lang = meta.language || meta.lang || meta.detected_language || '';
    const ci = meta.chunk_index ?? meta.chunk ?? meta.index;
    const docPreview = (row.document || '').substring(0, 100);
    const metaKeys = Object.keys(meta).slice(0,3).map(k => `<span class="meta-pill">${{escHtml(k)}}</span>`).join('');
    const emb = row.embedding_preview || [];
    const miniBar = emb.length ? emb.map(v => {{
      const h = Math.max(3, Math.min(20, Math.abs(v) * 60));
      const c = v >= 0 ? '#7c3aed' : '#dc2626';
      return `<div class="mini-bar-item" style="height:${{h}}px;background:${{c}}"></div>`;
    }}).join('') : '<span style="color:#94a3b8;font-size:10px">no embedding</span>';

    html += `<tr onclick="showDetail(${{i}})">
      <td class="cell-idx">${{i+1}}</td>
      <td class="cell-id"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:180px" title="${{escHtml(row.id)}}">${{escHtml(row.id)}}</span></td>
      <td class="cell-doc">
        ${{row.doc_name ? `<div style="font-weight:600;color:var(--accent);font-size:11px;margin-bottom:2px">${{escHtml(row.doc_name)}}</div>` : ''}}
        ${{row.doc_created_at ? `<div style="font-size:10px;color:var(--text3);margin-bottom:4px">📅 ${{escHtml(row.doc_created_at)}}</div>` : ''}}
        <span>${{escHtml(docPreview)}}${{row.document && row.document.length > 100 ? '<span class="more-tag">…</span>' : ''}}</span>
        <span class="wc-tag">${{row.word_count}} words · ${{row.char_count}} chars</span>
      </td>
      <td>
        ${{ci !== undefined && ci !== null ? `<span class="chunk-badge">#${{ci}}</span>` : ''}}
        ${{lang ? `<span class="lang-badge ${{getLangClass(lang)}}">${{lang}}</span>` : ''}}
      </td>
      <td class="cell-meta">${{metaKeys || '<span style="color:#94a3b8">—</span>'}}</td>
      <td><div class="mini-bar">${{miniBar}}</div></td>
    </tr>`;
  }});
  html += '</tbody></table>';
  wrap.innerHTML = html;
}}

function renderGrouped() {{
  const wrap = document.getElementById('table-wrap');
  if (!filteredRows.length) {{
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No chunks found</div></div>';
    return;
  }}

  // Group by document_id
  const groups = {{}};
  filteredRows.forEach((row, i) => {{
    const meta = row.metadata || {{}};
    const docId = meta.document_id || meta.doc_id || meta.source || 'unknown';
    if (!groups[docId]) {{
      groups[docId] = {{
        name: row.doc_name || docId,
        created_at: row.doc_created_at || '',
        items: []
      }};
    }}
    groups[docId].items.push({{ row, globalIdx: i }});
  }});

  // Sort groups by doc_created_at DESC (newest first)
  const sortedGroups = Object.entries(groups).sort((a, b) => {{
    const dateA = a[1].created_at || '';
    const dateB = b[1].created_at || '';
    return dateB.localeCompare(dateA);
  }});

  let html = `<table><thead><tr>
    <th class="cell-idx">#</th>
    <th>ID</th>
    <th>Document Preview</th>
    <th>Chunk / Lang</th>
    <th>Embedding</th>
  </tr></thead>`;

  let gIdx = 0;
  sortedGroups.forEach(([docId, groupObj]) => {{
    gIdx++;
    const gid = 'g' + gIdx;
    const displayName = groupObj.name;
    const items = groupObj.items;

    html += `<tbody>
      <tr class="group-header" onclick="toggleGroup('${{gid}}')">
        <td colspan="5" style="padding: 10px 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="group-toggle open" id="gt-${{gid}}">▶</span>
              <span>📄 CV: <strong style="font-family:'Outfit',sans-serif;font-size:13px;color:var(--accent);">${{escHtml(displayName)}}</strong></span>
              ${{docId !== displayName ? `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3)">(${{escHtml(docId)}})</span>` : ''}}
              <span class="badge badge-purple">${{items.length}} chunks</span>
            </div>
            ${{groupObj.created_at ? `<span class="badge badge-blue" style="font-size:10px; font-weight: 500;">📅 Analyzed: ${{escHtml(groupObj.created_at)}}</span>` : ''}}
          </div>
        </td>
      </tr>
      <tbody class="group-rows open" id="gr-${{gid}}">`;

    items.forEach((item, ci) => {{
      const row = item.row;
      const meta = row.metadata || {{}};
      const lang = meta.language || meta.lang || meta.detected_language || '';
      const chunkIdx = meta.chunk_index ?? meta.chunk ?? meta.index;
      const docPreview = (row.document || '').substring(0, 90);
      const emb = row.embedding_preview || [];
      const miniBar = emb.length ? emb.map(v => {{
        const h = Math.max(3, Math.min(20, Math.abs(v) * 60));
        const c = v >= 0 ? '#7c3aed' : '#dc2626';
        return `<div class="mini-bar-item" style="height:${{h}}px;background:${{c}}"></div>`;
      }}).join('') : '';

      html += `<tr onclick="showDetail(${{item.globalIdx}})">
        <td class="cell-idx">${{ci+1}}</td>
        <td class="cell-id"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:160px" title="${{escHtml(row.id)}}">${{escHtml(row.id)}}</span></td>
        <td class="cell-doc">
          <span>${{escHtml(docPreview)}}${{row.document && row.document.length > 90 ? '<span class="more-tag">…</span>' : ''}}</span>
          <span class="wc-tag">${{row.word_count}} words</span>
        </td>
        <td>
          ${{chunkIdx !== undefined && chunkIdx !== null ? `<span class="chunk-badge">#${{chunkIdx}}</span>` : ''}}
          ${{lang ? `<span class="lang-badge ${{getLangClass(lang)}}">${{lang}}</span>` : ''}}
        </td>
        <td><div class="mini-bar">${{miniBar}}</div></td>
      </tr>`;
    }});
    html += '</tbody></tbody>';
  }});
  html += '</table>';
  wrap.innerHTML = html;
}}

function toggleGroup(gid) {{
  const rows = document.getElementById('gr-' + gid);
  const arrow = document.getElementById('gt-' + gid);
  if (rows.classList.toggle('open')) {{
    arrow.textContent = '▶'; arrow.classList.add('open');
  }} else {{
    arrow.textContent = '▶'; arrow.classList.remove('open');
  }}
}}

// ---- Detail Modal ----
function showDetail(rowIdx) {{
  currentRow = filteredRows[rowIdx];
  const row = currentRow;
  const meta = row.metadata || {{}};
  const lang = meta.language || meta.lang || meta.detected_language || '';

  document.getElementById('modal-title').textContent = 'Chunk — ' + row.id.substring(0, 40) + (row.id.length > 40 ? '…' : '');

  const lb = document.getElementById('modal-lang-badge');
  lb.innerHTML = lang ? `<span class="lang-badge ${{getLangClass(lang)}}" style="margin-right:8px">${{lang}}</span>` : '';

  // Tab: Document
  document.getElementById('modal-doc').textContent = row.document || '(empty)';

  // Tab: Metadata
  document.getElementById('modal-meta').textContent = JSON.stringify(meta, null, 2);

  // Tab: Embedding
  const emb = row.embedding_preview || [];
  const chart = document.getElementById('modal-emb-chart');
  if (emb.length) {{
    chart.innerHTML = emb.map(v => {{
      const h = Math.max(4, Math.min(52, Math.abs(v) * 150));
      const cls = v >= 0 ? 'emb-pos' : 'emb-neg';
      return `<div class="emb-bar ${{cls}}" style="height:${{h}}px" title="${{v}}"></div>`;
    }}).join('');
  }} else {{
    chart.innerHTML = '<span style="color:#94a3b8;font-size:12px;margin:auto">No embedding data</span>';
  }}
  document.getElementById('modal-emb').textContent = emb.length
    ? '[' + emb.join(', ') + (row.embedding_dim > emb.length ? `, ... (${{'+'+ (row.embedding_dim - emb.length)}} more)]` : ']')
    : '—';

  // Tab: Info
  const ci = meta.chunk_index ?? meta.chunk ?? meta.index;
  const docId2 = meta.document_id || meta.doc_id || '—';
  document.getElementById('modal-info-grid').innerHTML = `
    <div class="info-item"><div class="lbl">Word Count</div><div class="val">${{row.word_count}}</div></div>
    <div class="info-item"><div class="lbl">Char Count</div><div class="val">${{row.char_count}}</div></div>
    <div class="info-item"><div class="lbl">Chunk Index</div><div class="val">${{ci !== undefined && ci !== null ? ci : '—'}}</div></div>
    <div class="info-item"><div class="lbl">Embedding Dims</div><div class="val">${{row.embedding_dim || '—'}}</div></div>
    <div class="info-item" style="grid-column:span 2"><div class="lbl">Document ID</div><div class="val" style="font-size:11px;font-family:'JetBrains Mono',monospace;word-break:break-all">${{escHtml(docId2)}}</div></div>
  `;
  document.getElementById('modal-id').textContent = row.id;

  switchTab(currentTabId);
  document.getElementById('modal').classList.add('open');
}}

function closeModal() {{ document.getElementById('modal').classList.remove('open'); }}

function switchTab(id) {{
  currentTabId = id;
  ['text','meta','emb','info'].forEach(t => {{
    document.getElementById('tab-' + t).classList.toggle('active', t === id);
    document.getElementById('tab-btn-' + t).classList.toggle('active', t === id);
  }});
}}

// ---- Copy ----
function copyField(field) {{
  if (!currentRow) return;
  let text = '';
  if (field === 'doc') text = currentRow.document || '';
  else if (field === 'meta') text = JSON.stringify(currentRow.metadata || {{}}, null, 2);
  else if (field === 'emb') text = JSON.stringify(currentRow.embedding_preview || []);
  else if (field === 'id') text = currentRow.id || '';

  navigator.clipboard.writeText(text).then(() => {{
    showToast('Copied to clipboard!');
    const btn = document.getElementById('copy-' + field + '-btn');
    if (btn) {{
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {{ btn.textContent = 'Copy'; btn.classList.remove('copied'); }}, 1500);
    }}
  }}).catch(() => showToast('Copy failed'));
}}

// ---- Export ----
function exportJSON() {{
  if (currentCol === null) {{ showToast('Select a collection first'); return; }}
  const data = {{ collection: DB[currentCol].name, exported: new Date().toISOString(), count: filteredRows.length, rows: filteredRows }};
  const blob = new Blob([JSON.stringify(data, null, 2)], {{type: 'application/json'}});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = DB[currentCol].name + '_export.json';
  a.click();
  showToast('Exported ' + filteredRows.length + ' chunks');
}}

// ---- Toast ----
function showToast(msg) {{
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}}

function escHtml(str) {{
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}}

// Keyboard shortcuts
document.addEventListener('keydown', e => {{
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {{
    e.preventDefault();
    document.getElementById('search').focus();
  }}
}});

// Init
buildSidebar();
if (DB.length) selectCol(0);
</script>
</body>
</html>"""
    return html


def main():
    global local_client
    print("=" * 55)
    print("  ChromaDB Viewer Generator — Enhanced Edition")
    print("=" * 55)
    print(f"\n  Connecting to HTTP REST API: {CHROMA_HOST}")

    heartbeat = api_get("/api/v1/heartbeat")
    if heartbeat is None:
        heartbeat = api_get("/api/v2/heartbeat")

    server_reachable = heartbeat is not None
    host_text = CHROMA_HOST
    status_text = "Connected"

    if server_reachable:
        print("  [OK] ChromaDB HTTP server is reachable!")
    else:
        print("  [OFFLINE] ChromaDB HTTP server is NOT running at localhost:8001")
        print("  -> Attempting to load from local persistent storage...")

        script_dir = os.path.dirname(os.path.abspath(__file__))
        path1 = os.path.abspath(os.path.join(script_dir, "../chroma_data"))
        path2 = os.path.abspath(os.path.join(script_dir, "chroma_data"))

        persist_path = None
        for p in [path1, path2]:
            if os.path.exists(os.path.join(p, "chroma.sqlite3")):
                persist_path = p
                break

        if persist_path:
            try:
                import chromadb
                local_client = chromadb.PersistentClient(path=persist_path)
                local_client.list_collections()
                server_reachable = True
                status_text = "Local Database"
                host_text = f"Local: {os.path.basename(persist_path)}"
                print(f"  [OK] Connected to local persistent DB: {persist_path}")
            except Exception as e:
                print(f"  [ERROR] Found chroma_data but failed to open: {e}")
                local_client = None
        else:
            print("  [ERROR] Could not find local chroma_data/chroma.sqlite3")
            print("    (Will generate viewer with empty state)")

    print("\n  Fetching collections...")
    collections, ok = fetch_collections()

    if collections is not None:
        print(f"  [OK] Found {len(collections)} collection(s)")
        for col in collections:
            print(f"    - {col.get('name', '?')}")
    else:
        print("  [ERROR] Could not fetch collections")
        collections = []

    print("\n  Generating enhanced HTML viewer...")
    html_out = generate_html(collections, server_reachable, status_text, host_text)

    output = "chromadb_viewer.html"
    with open(output, "w", encoding="utf-8") as f:
        f.write(html_out)

    print(f"  [OK] Saved: {output}")
    print(f"\n  Open in browser: file://{os.path.abspath(output)}")
    print("\n" + "=" * 55)


if __name__ == "__main__":
    main()
