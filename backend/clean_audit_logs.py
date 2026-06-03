import sqlite3

def clean():
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    
    # 1. Get active IDs
    cursor.execute("SELECT id FROM cv_documents")
    active_cv_ids = {row[0] for row in cursor.fetchall()}
    
    cursor.execute("SELECT id FROM job_descriptions")
    active_jd_ids = {row[0] for row in cursor.fetchall()}
    
    cursor.execute("SELECT id FROM analysis_records")
    active_analysis_ids = {row[0] for row in cursor.fetchall()}
    
    print(f"Active CVs: {len(active_cv_ids)}")
    print(f"Active JDs: {len(active_jd_ids)}")
    print(f"Active Analyses: {len(active_analysis_ids)}")
    
    # 2. Process audit_logs
    cursor.execute("SELECT id, resource_type, resource_id FROM audit_logs")
    all_audit_logs = cursor.fetchall()
    
    audit_logs_to_delete = []
    for audit_id, resource_type, resource_id in all_audit_logs:
        if resource_id:
            if resource_type == 'cv_document' and resource_id not in active_cv_ids:
                audit_logs_to_delete.append(audit_id)
            elif resource_type == 'job_description' and resource_id not in active_jd_ids:
                audit_logs_to_delete.append(audit_id)
            elif resource_type == 'analysis' and resource_id not in active_analysis_ids:
                audit_logs_to_delete.append(audit_id)
            elif resource_type == 'analysis_record' and resource_id not in active_analysis_ids:
                audit_logs_to_delete.append(audit_id)
                
    # 3. Process pii_audit_trail
    cursor.execute("SELECT id, document_id FROM pii_audit_trail")
    all_pii_audit = cursor.fetchall()
    
    pii_audit_to_delete = []
    for pii_id, document_id in all_pii_audit:
        if not document_id or document_id not in active_cv_ids:
            pii_audit_to_delete.append(pii_id)
            
    print(f"\nTotal audit_logs: {len(all_audit_logs)}")
    print(f"Audit logs to delete: {len(audit_logs_to_delete)}")
    
    print(f"\nTotal pii_audit_trail entries: {len(all_pii_audit)}")
    print(f"PII audit trail entries to delete: {len(pii_audit_to_delete)}")
    
    # Perform deletion
    if audit_logs_to_delete:
        placeholders = ','.join('?' for _ in audit_logs_to_delete)
        cursor.execute(f"DELETE FROM audit_logs WHERE id IN ({placeholders})", audit_logs_to_delete)
        print(f"Deleted {cursor.rowcount} rows from audit_logs.")
        
    if pii_audit_to_delete:
        placeholders = ','.join('?' for _ in pii_audit_to_delete)
        cursor.execute(f"DELETE FROM pii_audit_trail WHERE id IN ({placeholders})", pii_audit_to_delete)
        print(f"Deleted {cursor.rowcount} rows from pii_audit_trail.")
        
    conn.commit()
    print("Database audit logs cleanup committed successfully.")
    conn.close()

if __name__ == '__main__':
    clean()
