import sqlite3
import json
import os
import html

def escape_html(val):
    if val is None:
        return ""
    return html.escape(str(val))

def generate():
    db_path = 'ai_resume.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get list of all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row['name'] for row in cursor.fetchall() if row['name'] != 'sqlite_sequence']

    db_data = {}
    db_schemas = {}
    table_counts = {}

    for table in tables:
        # Get schema
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [dict(col) for col in cursor.fetchall()]
        db_schemas[table] = columns

        # Get rows
        cursor.execute(f"SELECT * FROM {table};")
        rows = []
        for row in cursor.fetchall():
            row_dict = {}
            for key in row.keys():
                val = row[key]
                if isinstance(val, bytes):
                    try:
                        row_dict[key] = val.decode('utf-8', errors='replace')
                    except Exception:
                        row_dict[key] = f"<binary blob: {len(val)} bytes>"
                else:
                    row_dict[key] = val
            rows.append(row_dict)
        db_data[table] = rows
        table_counts[table] = len(rows)

    conn.close()

    # Create HTML
    html_content = f"""<!DOCTYPE html>
<html lang="en" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Resume Analyzer - Database Explorer</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Tailwind CSS (via Play CDN for rapid prototyping) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {{
            darkMode: 'class',
            theme: {{
                extend: {{
                    fontFamily: {{
                        sans: ['Plus Jakarta Sans', 'sans-serif'],
                        outfit: ['Outfit', 'sans-serif'],
                    }},
                    colors: {{
                        brand: {{
                            50: '#f5f3ff',
                            100: '#eedeff',
                            500: '#8b5cf6',
                            600: '#7c3aed',
                            700: '#6d28d9',
                            900: '#4c1d95',
                        }},
                        darkbg: {{
                            DEFAULT: '#f8fafc',
                            card: '#ffffff',
                            border: '#e2e8f0',
                        }}
                    }}
                }}
            }}
        }}
    </script>
    <style>
        body {{
            background-color: #f8fafc;
            color: #0f172a;
        }}
        ::-webkit-scrollbar {{
            width: 8px;
            height: 8px;
        }}
        ::-webkit-scrollbar-track {{
            background: #f8fafc;
        }}
        ::-webkit-scrollbar-thumb {{
            background: #cbd5e1;
            border-radius: 4px;
        }}
        ::-webkit-scrollbar-thumb:hover {{
            background: #94a3b8;
        }}
    </style>
</head>
<body class="font-sans min-h-screen flex flex-col">

    <!-- Header -->
    <header class="border-b border-darkbg-border bg-darkbg-card/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-outfit font-bold text-xl shadow-lg shadow-brand-500/20">
                DB
            </div>
            <div>
                <h1 class="text-lg font-semibold font-outfit text-slate-900">Database Explorer</h1>
                <p class="text-xs text-slate-500">Interactive viewer for <code class="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">ai_resume.db</code></p>
            </div>
        </div>
        <div class="flex items-center space-x-4">
            <span class="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                SQLite 3
            </span>
            <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
            </span>
        </div>
    </header>

    <div class="flex flex-1 overflow-hidden h-[calc(100vh-73px)]">
        <!-- Sidebar -->
        <aside class="w-72 border-r border-darkbg-border bg-darkbg-card p-4 flex flex-col space-y-4 overflow-y-auto shrink-0">
            <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Tables</h3>
                <nav id="table-nav" class="space-y-1">
                    <!-- Nav items will be generated here -->
                </nav>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col overflow-hidden bg-slate-50 p-6">
            <!-- Table Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 mb-4 space-y-3 md:space-y-0 shrink-0">
                <div>
                    <h2 id="current-table-title" class="text-2xl font-bold font-outfit text-slate-900">Select a Table</h2>
                    <p id="current-table-desc" class="text-sm text-slate-500 mt-1">Choose a table from the sidebar to view data</p>
                </div>
                <div class="flex items-center space-x-3">
                    <input type="text" id="search-input" placeholder="Search rows..." class="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-brand-500 w-64 transition-all placeholder:text-slate-400">
                    <button onclick="exportTableToCSV()" class="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-750 transition-colors flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <!-- Table Container -->
            <div class="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-sm relative">
                <table class="w-full text-left border-collapse text-sm text-slate-700 relative" id="data-table">
                    <!-- Dynamic Header -->
                    <thead class="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200" id="table-head">
                    </thead>
                    <!-- Dynamic Body -->
                    <tbody class="divide-y divide-slate-200" id="table-body">
                        <tr>
                            <td class="p-8 text-center text-slate-400" colspan="100">
                                Please select a table from the sidebar to view its structure and rows.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination/Footer -->
            <div class="flex items-center justify-between pt-4 border-t border-slate-200 mt-4 shrink-0 text-xs text-slate-500">
                <div id="pagination-info">
                    Showing 0 to 0 of 0 entries
                </div>
                <div class="flex items-center space-x-2" id="pagination-controls">
                    <!-- Pagination buttons -->
                </div>
            </div>
        </main>
    </div>

    <!-- Row Detail Modal -->
    <div id="detail-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
        <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 class="text-lg font-bold font-outfit text-slate-900" id="modal-title">Row Details</h3>
                <button onclick="closeModal()" class="text-slate-500 hover:text-slate-800 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div class="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-slate-700" id="modal-content">
                <!-- Row details dynamically formatted -->
            </div>
            <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button onclick="closeModal()" class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition-colors">
                    Close
                </button>
            </div>
        </div>
    </div>

    <script>
        // Inject SQLite Data
        const dbData = {json.dumps(db_data)};
        const dbSchemas = {json.dumps(db_schemas)};
        const tableCounts = {json.dumps(table_counts)};

        let currentTable = null;
        let filteredRows = [];
        let currentPage = 1;
        const rowsPerPage = 25;

        // Render Sidebar Menu
        function initSidebar() {{
            const nav = document.getElementById('table-nav');
            nav.innerHTML = '';
            
            Object.keys(dbData).sort().forEach(tableName => {{
                const rowCount = tableCounts[tableName];
                const button = document.createElement('button');
                button.className = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left font-medium group hover:bg-slate-100 hover:text-slate-900 text-slate-600`;
                button.id = `nav-${{tableName}}`;
                button.onclick = () => selectTable(tableName);
                
                button.innerHTML = `
                    <div class="flex items-center space-x-2.5 truncate">
                        <svg class="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <span class="truncate">${{tableName}}</span>
                    </div>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-slate-200 font-semibold text-slate-500 group-hover:text-slate-750 transition-all">${{rowCount}}</span>
                `;
                nav.appendChild(button);
            }});
        }}

        // Select Table
        function selectTable(tableName) {{
            if (currentTable) {{
                document.getElementById(`nav-${{currentTable}}`).classList.remove('bg-brand-600/10', 'text-brand-600', 'border-l-2', 'border-brand-500', 'pl-2');
                document.getElementById(`nav-${{currentTable}}`).classList.add('text-slate-600');
            }}
            
            currentTable = tableName;
            const activeBtn = document.getElementById(`nav-${{tableName}}`);
            activeBtn.classList.remove('text-slate-600');
            activeBtn.classList.add('bg-brand-600/10', 'text-brand-600', 'border-l-2', 'border-brand-500', 'pl-2');

            document.getElementById('current-table-title').textContent = tableName;
            document.getElementById('current-table-desc').textContent = `Showing details and rows for table "${{tableName}}"`;

            // Reset search and pagination
            document.getElementById('search-input').value = '';
            currentPage = 1;

            filterAndRender();
        }}

        // Filter and Render Data
        function filterAndRender() {{
            if (!currentTable) return;

            const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
            const originalRows = dbData[currentTable];
            
            if (searchQuery === "") {{
                filteredRows = [...originalRows];
            }} else {{
                filteredRows = originalRows.filter(row => {{
                    return Object.values(row).some(val => {{
                        if (val === null || val === undefined) return false;
                        return String(val).toLowerCase().includes(searchQuery);
                    }});
                }});
            }}

            currentPage = 1;
            renderTableData();
        }}

        // Render Table Headers and Body
        function renderTableData() {{
            const schema = dbSchemas[currentTable];
            const tableHead = document.getElementById('table-head');
            const tableBody = document.getElementById('table-body');

            // Render Head
            let headHtml = '<tr>';
            headHtml += `<th class="px-4 py-3 bg-slate-50 border-b border-slate-200 text-center w-12 text-slate-400">#</th>`;
            schema.forEach(col => {{
                headHtml += `<th class="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold">${{col.name}}</th>`;
            }});
            headHtml += '</tr>';
            tableHead.innerHTML = headHtml;

            // Paginated rows
            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, filteredRows.length);
            const pageRows = filteredRows.slice(startIndex, endIndex);

            // Render Body
            if (pageRows.length === 0) {{
                tableBody.innerHTML = `
                    <tr>
                        <td class="p-8 text-center text-slate-400" colspan="${{schema.length + 1}}">
                            No rows found.
                        </td>
                    </tr>
                `;
            }} else {{
                let bodyHtml = '';
                pageRows.forEach((row, idx) => {{
                    bodyHtml += `<tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="showRowDetails(${{startIndex + idx}})">`;
                    bodyHtml += `<td class="px-4 py-3 text-center text-slate-400 border-r border-slate-100">${{startIndex + idx + 1}}</td>`;
                    
                    schema.forEach(col => {{
                        let val = row[col.name];
                        let displayVal = val;
                        
                        if (val === null) {{
                            displayVal = '<span class="text-slate-400 italic">null</span>';
                        }} else if (typeof val === 'string' && val.length > 80) {{
                            displayVal = escapeHtml(val.substring(0, 80)) + ' <span class="text-brand-600 font-medium font-outfit text-xs">...more</span>';
                        }} else if (typeof val === 'object') {{
                            displayVal = '<span class="text-indigo-600 font-mono text-xs">{object}</span>';
                        }} else {{
                            displayVal = escapeHtml(String(val));
                        }}
                        
                        bodyHtml += `<td class="px-4 py-3 max-w-xs truncate font-mono text-xs">${{displayVal}}</td>`;
                    }});
                    bodyHtml += '</tr>';
                }});
                tableBody.innerHTML = bodyHtml;
            }}

            // Render Pagination Info
            const pagInfo = document.getElementById('pagination-info');
            if (filteredRows.length === 0) {{
                pagInfo.textContent = `Showing 0 to 0 of 0 entries`;
            }} else {{
                pagInfo.textContent = `Showing ${{startIndex + 1}} to ${{endIndex}} of ${{filteredRows.length}} entries`;
            }}

            // Render Pagination buttons
            renderPaginationControls();
        }}

        function renderPaginationControls() {{
            const controls = document.getElementById('pagination-controls');
            controls.innerHTML = '';

            const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
            if (totalPages <= 1) return;

            // Prev Button
            const prevBtn = document.createElement('button');
            prevBtn.className = `px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all`;
            prevBtn.textContent = 'Previous';
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => {{ currentPage--; renderTableData(); }};
            controls.appendChild(prevBtn);

            // Page numbers (limit display to max 5)
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) {{
                startPage = Math.max(1, endPage - 4);
            }}

            for (let i = startPage; i <= endPage; i++) {{
                const pageBtn = document.createElement('button');
                pageBtn.className = `px-3 py-1.5 rounded-lg border font-medium transition-all ${{i === currentPage ? 'bg-brand-600 border-brand-500 text-white shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}}`;
                pageBtn.textContent = i;
                pageBtn.onclick = () => {{ currentPage = i; renderTableData(); }};
                controls.appendChild(pageBtn);
            }}

            // Next Button
            const nextBtn = document.createElement('button');
            nextBtn.className = `px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all`;
            nextBtn.textContent = 'Next';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => {{ currentPage++; renderTableData(); }};
            controls.appendChild(nextBtn);
        }}

        // Helper to escape HTML characters
        function escapeHtml(text) {{
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }}

        // Show Full Row Details in Modal
        function showRowDetails(index) {{
            const row = filteredRows[index];
            const schema = dbSchemas[currentTable];
            
            document.getElementById('modal-title').textContent = `Table "${{currentTable}}" - Row Detail #${{index + 1}}`;
            
            let contentHtml = '<div class="space-y-4 divide-y divide-slate-100">';
            schema.forEach(col => {{
                let val = row[col.name];
                let formattedVal = "";
                let isLongText = false;
                
                if (val === null) {{
                    formattedVal = '<span class="text-slate-400 italic">null</span>';
                }} else if (typeof val === 'string') {{
                    formattedVal = escapeHtml(val);
                    if (val.length > 150) isLongText = true;
                }} else if (typeof val === 'object') {{
                    formattedVal = JSON.stringify(val, null, 2);
                    isLongText = true;
                }} else {{
                    formattedVal = escapeHtml(String(val));
                }}

                contentHtml += `
                    <div class="pt-4 first:pt-0">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-xs font-bold font-outfit uppercase tracking-wider text-slate-500">${{col.name}}</span>
                            <span class="text-2xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">${{col.type}}</span>
                        </div>
                        ${{isLongText ? 
                            `<pre class="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto text-xs font-mono text-slate-800 max-h-96 whitespace-pre-wrap select-text">\\${{formattedVal}}</pre>` : 
                            `<div class="bg-slate-50/50 px-4 py-3 rounded-lg border border-slate-100 font-mono text-slate-800 select-text">\\${{formattedVal}}</div>`
                        }}
                    </div>
                `;
            }});
            contentHtml += '</div>';

            document.getElementById('modal-content').innerHTML = contentHtml;
            document.getElementById('detail-modal').classList.remove('hidden');
        }}

        function closeModal() {{
            document.getElementById('detail-modal').classList.add('hidden');
        }}

        // Export Table to CSV
        function exportTableToCSV() {{
            if (!currentTable || filteredRows.length === 0) return;
            
            const schema = dbSchemas[currentTable];
            const headers = schema.map(col => col.name);
            
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += headers.map(h => `"${{h.replace(/"/g, '""')}}"`).join(",") + "\\n";
            
            filteredRows.forEach(row => {{
                let rowData = headers.map(h => {{
                    let val = row[h];
                    if (val === null || val === undefined) return '""';
                    return `"${{String(val).replace(/"/g, '""')}}"`;
                }});
                csvContent += rowData.join(",") + "\\n";
            }});
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${{currentTable}}_export.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}

        // Event listener for search
        document.getElementById('search-input').addEventListener('input', filterAndRender);

        // Init page
        initSidebar();
        
        // Select first table if exists
        const tablesList = Object.keys(dbData);
        if (tablesList.length > 0) {{
            sortTableList = tablesList.sort();
            selectTable(sortTableList[0]);
        }}
    </script>
</body>
</html>
"""

    with open('database_viewer.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

    print("Success: Generated database_viewer.html successfully!")

if __name__ == "__main__":
    generate()
