from fastapi.testclient import TestClient
import sys
import pathlib

# ensure src is importable
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from app import app


client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # expect at least one known activity
    assert "Basketball Team" in data


def test_signup_and_unregister_flow():
    activity = "Basketball Team"
    email = "test.user@example.com"

    # ensure not already present
    res = client.get("/activities")
    assert res.status_code == 200
    before = res.json()
    participants_before = before[activity]["participants"][:]

    # signup
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert "Signed up" in res.json().get("message", "")

    # verify present
    res = client.get("/activities")
    after = res.json()
    assert email in after[activity]["participants"]

    # unregister
    res = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert res.status_code == 200
    assert "Unregistered" in res.json().get("message", "")

    # verify removed
    res = client.get("/activities")
    final = res.json()
    assert email not in final[activity]["participants"]
