import psycopg2

conn = psycopg2.connect("postgresql://neondb_owner:npg_Q5TaWC4rDxHG@ep-aged-silence-aims5ryc-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

# テスト用ユーザーが既にいるか確認
cur.execute("SELECT id, username, plan FROM users WHERE username = 'testuser';")
existing = cur.fetchone()

if existing:
    print(f"Test user already exists: id={existing[0]}, username={existing[1]}, plan={existing[2]}")
else:
    # テスト用ユーザーを作成 (password: test1234)
    cur.execute("""
        INSERT INTO users (username, password, display_name, email, role, plan, is_active, created_at, updated_at)
        VALUES ('testuser', '$2b$10$3P4iVE8P3/trLYK9.H/za.vGX2ftyZ7YQPdwD5OwdWgdrTcvk02HC', 'テストユーザー', 'test@example.com', 'viewer', 'free', true, NOW(), NOW())
        RETURNING id;
    """)
    new_id = cur.fetchone()[0]
    conn.commit()
    print(f"Created test user: id={new_id}, username=testuser, plan=free")

conn.close()
