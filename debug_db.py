from backend.database.core import get_db, init_db

init_db()
conn = get_db()
print("Models:", conn.execute('SELECT * FROM models').fetchall())
print("Prompts:", conn.execute('SELECT * FROM prompts').fetchall())
conn.close()
