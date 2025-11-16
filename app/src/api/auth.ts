export async function login(username: string, password: string) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (username === "admin" && password === "admin") {
        resolve({
          token: "mock-token-123",
          user: { name: "Admin" }
        });
      } else {
        reject(new Error("Invalid username or password"));
      }
    }, 700);
  });
}
