import psycopg2
import json

conn = psycopg2.connect("postgresql://neondb_owner:npg_Q5TaWC4rDxHG@ep-aged-silence-aims5ryc-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

# テーブル一覧
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
tables = cur.fetchall()
print("=== Tables ===")
for t in tables:
    print(f"  {t[0]}")

# usersテーブルのカラム確認
for table in ['users', 'user', 'User', 'accounts']:
    try:
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}';")
        cols = cur.fetchall()
        if cols:
            print(f"\n=== Columns in '{table}' ===")
            for c in cols:
                print(f"  {c[0]}")
    except:
        conn.rollback()

# ユーザーデータを取得（テーブル名を動的に）
for table in ['users', 'user', 'User']:
    try:
        cur.execute(f'SELECT * FROM "{table}" LIMIT 5;')
        rows = cur.fetchall()
        if rows:
            colnames = [desc[0] for desc in cur.description]
            print(f"\n=== Data from '{table}' ===")
            print(f"Columns: {colnames}")
            for row in rows:
                print(dict(zip(colnames, [str(v) for v in row])))
    except Exception as e:
        conn.rollback()

conn.close()
