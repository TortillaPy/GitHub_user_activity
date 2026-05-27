import https from "node:https";

export function fetchGitHubUserActivity(username: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/users/${username}/events`,
      method: "GET",
      headers: {
        "User-Agent": "GitHub-User-Activity-App",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2026-03-10"
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const events = JSON.parse(data);
            resolve(events);
          } catch (error) {
            reject(new Error("Failed to parse response from GitHub API."));
          }
        } else if (res.statusCode === 404) {
          reject(new Error("User not found."));
        } else {
          reject(new Error(`GitHub API returned status code ${res.statusCode}.`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();  

  });
}
