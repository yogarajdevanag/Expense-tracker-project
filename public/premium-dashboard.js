const token = new URLSearchParams(window.location.search).get("token") || localStorage.getItem("token");
let currentPage = 1;
let perPage = parseInt(localStorage.getItem("expensesPerPage")) || 10;

if (token) {
  localStorage.setItem("token", token);
} else {
  alert("Unauthorized access");
  window.location.href = "/signup-page.html";
}

const payload = JSON.parse(atob(token.split('.')[1]));

if (!payload.isPremium) {
  alert("You are not a premium user");
  window.location.href = "/expense-page.html";
}

// Load own expenses
function loadMyExpenses() {
  fetch("/expenses", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("expense-list");
      list.innerHTML = "";

      const totalPages = Math.ceil(data.length / perPage);
      const start = (currentPage - 1) * perPage;
      const end = start + perPage;
      const pageData = data.slice(start, end);

      pageData.forEach(exp => {
        const li = document.createElement("li");
        li.innerHTML = `
          ₹${exp.amount} - ${exp.description} (${exp.category})
          <button class="edit-btn" data-id="${exp.id}" data-amount="${exp.amount}" data-description="${exp.description}" data-category="${exp.category}">Edit</button>
          <button class="delete-btn" data-id="${exp.id}">Delete</button>
        `;
        list.appendChild(li);
      });

      document.getElementById("page-info").textContent = `Page ${currentPage} of ${totalPages}`;

      document.getElementById("prev-page").disabled = currentPage === 1;
      document.getElementById("next-page").disabled = currentPage === totalPages;

      // Re-bind delete/edit buttons
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteExpense(btn.dataset.id));
      });

      document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.getElementById("amount").value = btn.dataset.amount;
          document.getElementById("description").value = btn.dataset.description;
          document.getElementById("category").value = btn.dataset.category;
          const submitBtn = document.querySelector("#expense-form button");
          submitBtn.textContent = "Update Expense";
          submitBtn.dataset.editId = btn.dataset.id;
        });
      });
    });
}


      // Bind delete
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          deleteExpense(id);
        });
      });

      //  Bind edit
      document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          document.getElementById("amount").value = btn.dataset.amount;
          document.getElementById("description").value = btn.dataset.description;
          document.getElementById("category").value = btn.dataset.category;

          const submitBtn = document.querySelector("#expense-form button");
          submitBtn.textContent = "Update Expense";
          submitBtn.dataset.editId = id;
        });
      });
//  Delete expense
function deleteExpense(id) {
  fetch(`/expenses/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Delete failed");
      loadMyExpenses();
    })
    .catch(err => {
      console.error(" Delete failed:", err);
      alert("Failed to delete expense");
    });
}

//  Add or Update expense
document.getElementById("expense-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const amount = document.getElementById("amount").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const button = document.querySelector("#expense-form button");
  const editId = button.dataset.editId;

  const url = editId ? `/expenses/${editId}` : "/expenses";
  const method = editId ? "PUT" : "POST";

  fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount, description, category })
  })
    .then(res => res.json())
    .then(() => {
      document.getElementById("expense-form").reset();
      button.textContent = "Add Expense";
      delete button.dataset.editId;
      loadMyExpenses();
    })
    .catch(err => {
      console.error(" Error saving expense:", err);
      alert("Failed to save expense");
    });
});

// Load user's expenses on page load
loadMyExpenses();

// Leaderboard — show only name + total spent
document.getElementById("leaderboard-btn").addEventListener("click", () => {
  fetch("/leaderboard", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (!res.ok) throw new Error("Leaderboard fetch failed");
      return res.json();
    })
    .then(data => {
      const container = document.getElementById("leaderboard");
      if (!data.length) {
        container.innerHTML = "<p>No leaderboard data found</p>";
        return;
      }

      container.innerHTML = `
        <h3>📊 Leaderboard: Total Spending</h3>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Total Spent (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(user => `
              <tr>
                <td>${user.name}</td>
                <td>${user.total_spent}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    })
    .catch(err => {
      console.error(" Error loading leaderboard:", err);
      alert("Failed to load leaderboard");
    });
});

//  Filter by daily/weekly/monthly
document.getElementById("filter-btn").addEventListener("click", () => {
  const type = document.getElementById("filter-type").value;
  if (!type) return alert("Please select a filter type");

  fetch(`/expenses/filter?type=${type}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (!res.ok) throw new Error("Filter failed");
      return res.json();
    })
    .then(data => {
      const list = document.getElementById("expense-list");
      list.innerHTML = "";
      data.forEach(exp => {
        const li = document.createElement("li");
        li.textContent = `₹${exp.amount} - ${exp.description} (${exp.category})`;
        list.appendChild(li);
      });
    })
    .catch(err => {
      console.error(" Filter error:", err);
      alert("Failed to filter expenses");
    });
});

//  Download CSV
document.getElementById("download-btn").addEventListener("click", () => {
  fetch("/expenses/download", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (!res.ok) throw new Error("Download failed");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      console.error(" Download error:", err);
      alert("Failed to download CSV");
    });
});
// number of rows per sheet
document.getElementById("per-page").value = perPage;

document.getElementById("per-page").addEventListener("change", (e) => {
  perPage = parseInt(e.target.value);
  localStorage.setItem("expensesPerPage", perPage);
  currentPage = 1;
  loadMyExpenses();
});

document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    loadMyExpenses();
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  currentPage++;
  loadMyExpenses();
});
