import chromadb

def explore():
    try:
        # ChromaDB Client
        client = chromadb.HttpClient(host="localhost", port=8001)
        collections = client.list_collections()
        print("=== CHROMADB COLLECTIONS ===")
        print(f"Found {len(collections)} collections.")
        for col in collections:
            print(f"- Collection: {col.name}")
            print(f"  Count: {col.count()}")
            # Print a sample
            if col.count() > 0:
                peek = col.peek(limit=1)
                print(f"  Metadata Sample: {peek['metadatas'][0] if peek['metadatas'] else 'None'}")
    except Exception as e:
        print(f"Could not connect to ChromaDB: {e}")

if __name__ == "__main__":
    explore()
