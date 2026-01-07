document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const uiMap = {};

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
            const li = document.createElement("li");
            li.className = "participant-item";
            li.textContent = p;
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

      const ui = uiMap[activity];
      if (ui) {
        const empty = ui.participantsWrap.querySelector(".participant-empty");
        if (empty) empty.remove();

        let ul = ui.participantsWrap.querySelector(".participants-list");
        if (!ul) {
          ul = document.createElement("ul");
          ul.className = "participants-list";
          ui.participantsWrap.appendChild(ul);
        }
        const li = document.createElement("li");
        li.className = "participant-item";
        li.textContent = email;
        ul.appendChild(li);

        ui.badge.textContent = String((parseInt(ui.badge.textContent || "0", 10) || 0) + 1);

        const match = (ui.spotsLeftEl.textContent || "").match(/(\d+)/);
        if (match) {
          const newSpots = Math.max(0, parseInt(match[1], 10) - 1);
          ui.spotsLeftEl.textContent = `${newSpots} spots left`;
        }
      }
    } catch (err) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error(err);
    }
  });

  fetchActivities();
});
