import { fetchGitHubUserActivity } from "./githubServices.ts";

async function main() {
  const args: String[] = process.argv.slice(2);
  const username = args[0];

  if (!username) {
    console.error("Please provide a username as an argument.");
    console.error("Usage: npm start <username>");
    process.exit(1);
  }

  // Regular expression to validate GitHub usernames
  const githubUsernameRegex =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

  if (!githubUsernameRegex.test(username as string)) {
    console.error("Invalid GitHub username.");
    process.exit(1);
  }

  console.log(`\n Searching for GitHub user: ${username} \n`);

  try {
    const events = await fetchGitHubUserActivity(username as string);

    if (events.length === 0) {
      console.log("No recent activity found.");
    }

    console.log(`Recent activity found for user ${username}:\n`);

    events.forEach((event: any) => {
      const repoName = event.repo.name;

      switch (event.type) {
        case "PushEvent":
          const commits = event.payload.commits.length || 0;
          console.log(`- Pushed ${commits} commit(s) to ${repoName}`);
          break;

        case "IssuesEvent":
          if (event.payload.action === "opened") {
            console.log(`- Opened a new issue in ${repoName}`);
          }
          break;

        case "WatchEvent":
          console.log(`- Starred ${repoName}`);
          break;
        case "CreateEvent":
          if (event.payload.ref_type === "repository") {
            console.log(`- Created a new repository: ${repoName}`);
          }
          break;

        default:
          // If any error occurs or if the event type is not recognized, we can log it as a generic action
          console.log(`- Action [${event.type}] in ${repoName}`);
          break;
      }
    });
  } catch (error) {
    console.error("Error fetching GitHub user activity:", error);
  }
}

main();
