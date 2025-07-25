document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.status === 200) {
      localStorage.setItem("token", result.token); //  Fixed here
      alert(result.message);
      window.location.href = "expense-page.html";
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert("Login failed.");
    console.error(err);
  }
});
