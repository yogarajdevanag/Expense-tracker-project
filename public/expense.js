document.getElementById("expenseForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const amount = document.getElementById("amount").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;
  const token = localStorage.getItem("token");

  if (!amount || !description || !category || !date)
    return alert("All fields are required.");

  try {
    const response = await fetch("/add-expense", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ amount, description, category, date })
    });

    const data = await response.json();
    alert(data.message);

    if (response.ok) {
      document.getElementById("expenseForm").reset();
      fetchExpenses();
    }
  } catch (error) {
    console.error("Error adding expense:", error);
    alert("Error adding expense.");
  }
});

async function fetchExpenses() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch("/expenses", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const expenses = await res.json();

    const list = document.getElementById("expenseList");
    list.innerHTML = "";

    expenses.forEach(exp => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${exp.description}</td>
        <td>₹${exp.amount}</td>
        <td>${exp.category}</td>
        <td>${new Date(exp.date).toLocaleDateString()}</td>
        <td>
          <button onclick="deleteExpense(${exp.id})">Delete</button>
        </td>
      `;

      list.appendChild(row);
    });
  } catch (err) {
    alert("Failed to load expenses.");
    console.error("Error fetching:", err);
  }
}

async function deleteExpense(id) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`/expenses/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const result = await res.json();
    alert(result.message);
    fetchExpenses();
  } catch (err) {
    alert("Failed to delete expense.");
    console.error(err);
  }
}

document.getElementById("buyPremium").addEventListener("click", async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch("/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok && data.paymentSessionId && data.orderId) {
      const cashfree = Cashfree({ mode: "sandbox" }); // switch to "production" later

      //  Build your return URL with token
      const returnUrl = `http://localhost:3000/payment-status?order_id=${data.orderId}&token=${token}`;

      await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_self",
        returnUrl: returnUrl // ✅ override default return
      });
    } else {
      alert(data.message || "Could not initiate payment.");
    }
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Something went wrong");
  }
});


window.onload = fetchExpenses;
