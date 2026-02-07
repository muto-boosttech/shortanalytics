import psycopg2

conn = psycopg2.connect("postgresql://neondb_owner:npg_Q5TaWC4rDxHG@ep-aged-silence-aims5ryc-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

# マスター管理者ユーザーが既にいるか確認
cur.execute("SELECT id, username, role, plan FROM users WHERE username = 'admin';")
existing = cur.fetchone()

if existing:
    print(f"Admin user already exists: id={existing[0]}, username={existing[1]}, role={existing[2]}, plan={existing[3]}")
    # roleをmaster_adminに更新
    cur.execute("UPDATE users SET role = 'master_admin' WHERE username = 'admin';")
    conn.commit()
    print("Updated role to master_admin")
else:
    # マスター管理者ユーザーを作成 (password: admin1234)
    cur.execute("""
        INSERT INTO users (username, password, display_name, email, role, plan, is_active, created_at, updated_at)
        VALUES ('admin', '$2b$10$3P4iVE8P3/trLYK9.H/za.vGX2ftyZ7YQPdwD5OwdWgdrTcvk02HC', 'マスター管理者', 'admin@example.com', 'master_admin', 'max', true, NOW(), NOW())
        RETURNING id;
    """)
    new_id = cur.fetchone()[0]
    conn.commit()
    print(f"Created admin user: id={new_id}, username=admin, role=master_admin, plan=max")

conn.close()
