"""Export all tables from MySQL to a local SQLite database file."""
import sqlite3
from sqlalchemy import create_engine, text, inspect

# ── MySQL source ─────────────────────────────────────────────────────────
MYSQL_URI = "mysql+pymysql://root:@localhost:3306/text_to_sql"
mysql_engine = create_engine(MYSQL_URI)

# ── SQLite destination ───────────────────────────────────────────────────
SQLITE_PATH = "database.db"
sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_cur = sqlite_conn.cursor()

inspector = inspect(mysql_engine)
tables = inspector.get_table_names()

print(f"Found {len(tables)} tables: {tables}\n")

with mysql_engine.connect() as conn:
    for table in tables:
        print(f"  Exporting: {table}")

        # Get all rows
        rows = conn.execute(text(f"SELECT * FROM `{table}`")).fetchall()
        columns = conn.execute(text(f"SELECT * FROM `{table}` LIMIT 1")).keys()
        col_names = list(columns)

        if not col_names:
            print(f"    ⚠ Skipped (no columns)")
            continue

        # Create table in SQLite
        # Quote column names to handle spaces / reserved words
        quoted_cols = ", ".join(f'"{c}" TEXT' for c in col_names)
        sqlite_cur.execute(f'DROP TABLE IF EXISTS "{table}"')
        sqlite_cur.execute(f'CREATE TABLE "{table}" ({quoted_cols})')

        # Insert rows
        placeholders = ", ".join("?" for _ in col_names)
        quoted_insert_cols = ", ".join(f'"{c}"' for c in col_names)
        for row in rows:
            sqlite_cur.execute(
                f'INSERT INTO "{table}" ({quoted_insert_cols}) VALUES ({placeholders})',
                tuple(str(v) if v is not None else None for v in row),
            )

        print(f"    ✓ {len(rows)} rows exported")

sqlite_conn.commit()
sqlite_conn.close()
print(f"\n✅ Done! SQLite database saved to: {SQLITE_PATH}")
