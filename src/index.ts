import { fetchGitHubUserActivity, fetchCommitCount } from "./githubServices.ts";

async function main() {
  const args: string[] = process.argv.slice(2);
  const username = args[0];

  if (!username) {
    console.error("Please provide a username as an argument.");
    console.error("Usage: npm start <username>");
    process.exit(1);
  }

  // Regular expression to validate GitHub usernames
  const githubUsernameRegex =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

  if (!githubUsernameRegex.test(username)) {
    console.error("Invalid GitHub username.");
    process.exit(1);
  }

  console.log(`\n Searching for GitHub user: ${username} \n`);

  try {
    const events = await fetchGitHubUserActivity(username);

    if (events.length === 0) {
      console.log("No recent activity found.");
      return;
    }

    // Pre-fetch commit counts for PushEvents to handle GitHub Events API payload optimizations (commits array omission)
    const pushEvents = events.filter((event: any) => event.type === "PushEvent");
    await Promise.all(
      pushEvents.map(async (event: any) => {
        const repoName = event.repo.name;
        const before = event.payload.before;
        const head = event.payload.head;
        try {
          const count = await fetchCommitCount(repoName, before, head);
          event.payload.commitsCount = count;
        } catch {
          event.payload.commitsCount = 0;
        }
      })
    );

    console.log(`Recent activity found for user ${username}:\n`);

    events.forEach((event: any) => {
      const repoName = event.repo.name;

      switch (event.type) {
        case "PushEvent": {
          const commits = event.payload.commitsCount !== undefined ? event.payload.commitsCount : (event.payload.commits?.length || 0);
          console.log(`- Pushed ${commits} commit(s) to ${repoName}`);
          break;
        }

        case "IssuesEvent": {
          const action = event.payload.action;
          const issueNum = event.payload.issue?.number ? ` #${event.payload.issue.number}` : "";
          console.log(`- ${action.charAt(0).toUpperCase() + action.slice(1)} an issue${issueNum} in ${repoName}`);
          break;
        }

        case "WatchEvent":
          console.log(`- Starred ${repoName}`);
          break;

        case "CreateEvent": {
          const refType = event.payload.ref_type;
          if (refType === "repository") {
            console.log(`- Created a new repository: ${repoName}`);
          } else {
            console.log(`- Created ${refType} '${event.payload.ref || ""}' in ${repoName}`);
          }
          break;
        }

        case "DeleteEvent": {
          console.log(`- Deleted ${event.payload.ref_type} '${event.payload.ref || ""}' in ${repoName}`);
          break;
        }

        case "ForkEvent":
          console.log(`- Forked ${repoName}`);
          break;

        case "PullRequestEvent": {
          const action = event.payload.action;
          const prNum = event.payload.pull_request?.number ? ` #${event.payload.pull_request.number}` : "";
          if (action === "closed" && event.payload.pull_request?.merged) {
            console.log(`- Merged pull request${prNum} in ${repoName}`);
          } else {
            console.log(`- ${action.charAt(0).toUpperCase() + action.slice(1)} pull request${prNum} in ${repoName}`);
          }
          break;
        }

        case "IssueCommentEvent":
          console.log(`- Commented on an issue in ${repoName}`);
          break;

        default:
          // For other event types, log them dynamically
          const formattedType = event.type.replace("Event", "");
          console.log(`- Action [${formattedType}] in ${repoName}`);
          break;
      }
    });
  } catch (error: any) {
    console.error("Error fetching GitHub user activity:", error.message || error);
  }
}

main();
