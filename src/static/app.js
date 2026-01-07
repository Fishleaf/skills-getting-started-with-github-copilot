document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const uiMap = {};

  async function unregisterParticipant(activity, email, li, ui) {
    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showMessage(json.detail || "Failed to remove participant", "error");
        return;
      }

      // remove from UI
      if (li && li.parentNode) li.parentNode.removeChild(li);

      if (ui) {
        // update badge
        ui.badge.textContent = String(Math.max(0, (parseInt(ui.badge.textContent || "0", 10) || 0) - 1));

        // update spots left
        const match = (ui.spotsLeftEl.textContent || "").match(/(\d+)/);
        if (match) {
          const newSpots = parseInt(match[1], 10) + 1;
          ui.spotsLeftEl.textContent = `${newSpots} spots left`;
        }

        // if no participants remain, show empty message
        const ul = ui.participantsWrap.querySelector(".participants-list");
        if (!ul || ul.children.length === 0) {
          const empty = document.createElement("div");
          empty.className = "participant-empty";
          empty.textContent = "No participants yet.";
          if (ul && ul.parentNode) ul.parentNode.replaceChild(empty, ul);
          else ui.participantsWrap.appendChild(empty);
        }
      }

      showMessage(json.message || `Unregistered ${email}`, "success");
    } catch (err) {
      console.error(err);
      showMessage("Failed to unregister participant.", "error");
    }
  }

  function createParticipantListItem(email, activityName, ui) {
    const li = document.createElement("li");
    li.className = "participant-item";

    const span = document.createElement("span");
    span.textContent = email;
    span.className = "participant-email";

    const btn = document.createElement("button");
    btn.className = "delete-btn";
    btn.title = "Remove participant";
    btn.textContent = "✖";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unregisterParticipant(activityName, email, li, ui);
    });

    li.appendChild(span);
    li.appendChild(btn);
    return li;
  }

  function showMessage(text, cls = "error") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${cls}`;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 4000);
  }

  async function fetchActivities() {
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const activities = await res.json();

      activitiesList.innerHTML = "";
      // keep placeholder option, remove others
      Array.from(activitySelect.options).slice(1).forEach(o => o.remove());

      Object.entries(activities).forEach(([name, details]) => {
        const participants = details.participants || [];
        const spotsLeft = Math.max(0, (details.max_participants || 0) - participants.length);

        const card = document.createElement("div");
        card.className = "activity-card";

        // build participants section
        const participantsWrap = document.createElement("div");
        participantsWrap.className = "participants";
        const header = document.createElement("h5");
        header.textContent = "Participants ";
        const badge = document.createElement("span");
        badge.className = "count-badge";
        badge.textContent = String(participants.length);
        header.appendChild(badge);
        participantsWrap.appendChild(header);

        if (participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          participants.forEach(p => {
            const li = createParticipantListItem(p, name, uiMap[name]);
            ul.appendChild(li);
          });
          participantsWrap.appendChild(ul);
        } else {
          const empty = document.createElement("div");
          empty.className = "participant-empty";
          empty.textContent = "No participants yet.";
          participantsWrap.appendChild(empty);
        }

        // render card WITHOUT the schedule line
        card.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description || ""}</p>
          <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft} spots left</span></p>
        `;
        card.appendChild(participantsWrap);
        activitiesList.appendChild(card);

        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        activitySelect.appendChild(opt);

        uiMap[name] = { card, participantsWrap, badge, spotsLeftEl: card.querySelector(".spots-left") };
      });
    } catch (err) {
      activitiesList.innerHTML = "<p class='error'>Unable to load activities.</p>";
      console.error(err);
    }
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;
    if (!email || !activity) {
      showMessage("Please provide an email and select an activity.", "error");
      return;
    }

    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showMessage(json.detail || "Signup failed", "error");
        return;
      }

      showMessage(json.message || "Signed up!", "success");
      signupForm.reset();

      // Refresh activities from server to ensure UI matches backend
      await fetchActivities();
    } catch (err) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error(err);
    }
  });

  fetchActivities();
});
