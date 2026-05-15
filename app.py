import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

from langchain_community.utilities import SQLDatabase
from langchain.chat_models import init_chat_model
from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit
from langchain_core.prompts import ChatPromptTemplate
from langgraph.prebuilt import create_react_agent

# ── Configuration ────────────────────────────────────────────────────────────
load_dotenv()  # loads GOOGLE_API_KEY from .env file

HOST = "localhost"
PORT = "3306"
USERNAME = "root"
PASSWORD = ""
DATABASE = "text_to_sql"
MYSQL_URI = f"mysql+pymysql://{USERNAME}:{PASSWORD}@{HOST}:{PORT}/{DATABASE}"

# ── Initialise LangChain components once at startup ──────────────────────────
db = SQLDatabase.from_uri(MYSQL_URI)
llm = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
toolkit = SQLDatabaseToolkit(db=db, llm=llm)

prompt_template = ChatPromptTemplate.from_messages([
    ("system",
     "You are an agent designed to interact with a SQL database.\n"
     "Given an input question, create a syntactically correct {dialect} query to run, "
     "then look at the results of the query and return the answer.\n"
     "Always limit your query to at most {top_k} results unless the user specifies otherwise.\n"
     "You can order the results by a relevant column to return the most interesting data.\n"
     "Never query for all the columns from a specific table, only ask for the relevant columns given the question.\n"
     "You have access to tools for interacting with the database.\n"
     "Only use the below tools. Only use the information returned by the below tools to construct your final answer.\n"
     "You MUST double check your query before executing it. If you get an error while executing a query, rewrite the query and try again.\n\n"
     "DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.\n\n"
     "To start you should ALWAYS look at the tables in the database to see what you can query.\n"
     "Do NOT skip this step."),
    ("placeholder", "{messages}"),
])

system_message = prompt_template.format(dialect="mysql", top_k=5)
agent_executor = create_react_agent(llm, toolkit.get_tools(), prompt=system_message)

# ── Flask App ────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static")
CORS(app)


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/query", methods=["POST"])
def query():
    """Accept a natural-language question and return the agent's answer."""
    data = request.get_json(force=True)
    user_question = data.get("question", "").strip()

    if not user_question:
        return jsonify({"error": "No question provided."}), 400

    try:
        # Collect all events; final AI message is the answer
        events = agent_executor.stream(
            {"messages": [("user", user_question)]},
            stream_mode="values",
        )

        steps = []
        final_answer = ""
        for event in events:
            last_msg = event["messages"][-1]
            msg_type = last_msg.type  # "human", "ai", or "tool"

            if msg_type == "ai" and not last_msg.tool_calls:
                # This is the final answer (AI message with no tool calls)
                content = last_msg.content
                # Handle list-type content (Gemini sometimes returns a list)
                if isinstance(content, list):
                    final_answer = " ".join(
                        item.get("text", "") if isinstance(item, dict) else str(item)
                        for item in content
                    )
                else:
                    final_answer = content

            elif msg_type == "ai" and last_msg.tool_calls:
                for tc in last_msg.tool_calls:
                    steps.append({
                        "type": "tool_call",
                        "tool": tc["name"],
                        "input": tc.get("args", {}),
                    })

            elif msg_type == "tool":
                steps.append({
                    "type": "tool_result",
                    "tool": last_msg.name,
                    "output": last_msg.content[:500],  # truncate long outputs
                })

        return jsonify({
            "answer": final_answer,
            "steps": steps,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tables", methods=["GET"])
def tables():
    """Return the list of available database tables."""
    return jsonify({"tables": db.get_usable_table_names()})


@app.route("/api/table/<table_name>", methods=["GET"])
def table_data(table_name):
    """Return the columns and rows for a specific table."""
    allowed = db.get_usable_table_names()
    if table_name not in allowed:
        return jsonify({"error": f"Table '{table_name}' not found."}), 404

    try:
        from sqlalchemy import text

        engine = db._engine
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT * FROM `{table_name}` LIMIT 100"))
            columns = list(result.keys())
            rows = [list(row) for row in result.fetchall()]

        # Get total row count
        with engine.connect() as conn:
            count_result = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`"))
            total_rows = count_result.scalar()

        return jsonify({
            "table": table_name,
            "columns": columns,
            "rows": rows,
            "total_rows": total_rows,
            "showing": len(rows),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n🚀  Text-to-SQL Chatbot is running at http://localhost:5000\n")
    app.run(debug=True, port=5000)
