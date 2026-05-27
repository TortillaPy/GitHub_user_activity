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
        "X-GitHub-Api-Version": "2022-11-28"
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
        } else if (res.statusCode === 403) {
          reject(new Error("GitHub API rate limit exceeded. Please try again later."));
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

export function fetchCommitCount(repoName: string, before: string, head: string): Promise<number> {
  return new Promise((resolve) => {
    // If before is empty, zeroes, or missing, we can't compare
    if (!before || before === "0000000000000000000000000000000000000000" || !head) {
      resolve(1); // Default fallback for branch/repo creation push
      return;
    }

    const options = {
      hostname: "api.github.com",
      path: `/repos/${repoName}/compare/${before}...${head}`,
      method: "GET",
      headers: {
        "User-Agent": "GitHub-User-Activity-App",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
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
            const comparison = JSON.parse(data);
            resolve(comparison.total_commits || 0);
          } catch {
            resolve(0);
          }
        } else {
          resolve(0);
        }
      });
    });

    req.on("error", () => {
      resolve(0);
    });

    req.end();
  });
}

