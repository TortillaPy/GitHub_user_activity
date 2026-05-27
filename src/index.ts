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

    // Initialize summaries
    const pushSummary: Record<string, number> = {};
    const issueSummary: Record<string, Record<string, number>> = {};
    const watchSummary: Set<string> = new Set();
    const createSummary: Record<string, Record<string, number>> = {};
    const deleteSummary: Record<string, Record<string, number>> = {};
    const forkSummary: Set<string> = new Set();
    const prSummary: Record<string, Record<string, number>> = {};
    const commentSummary: Record<string, number> = {};
    const otherSummary: Record<string, Set<string>> = {};

    events.forEach((event: any) => {
      const repoName = event.repo.name;

      switch (event.type) {
        case "PushEvent": {
          const commits = event.payload.commitsCount !== undefined ? event.payload.commitsCount : (event.payload.commits?.length || 0);
          pushSummary[repoName] = (pushSummary[repoName] || 0) + commits;
          break;
        }

        case "IssuesEvent": {
          const action = event.payload.action || "opened";
          if (!issueSummary[repoName]) issueSummary[repoName] = {};
          issueSummary[repoName][action] = (issueSummary[repoName][action] || 0) + 1;
          break;
        }

        case "WatchEvent":
          watchSummary.add(repoName);
          break;

        case "CreateEvent": {
          const refType = event.payload.ref_type || "repository";
          if (!createSummary[repoName]) createSummary[repoName] = {};
          createSummary[repoName][refType] = (createSummary[repoName][refType] || 0) + 1;
          break;
        }

        case "DeleteEvent": {
          const refType = event.payload.ref_type || "branch";
          if (!deleteSummary[repoName]) deleteSummary[repoName] = {};
          deleteSummary[repoName][refType] = (deleteSummary[repoName][refType] || 0) + 1;
          break;
        }

        case "ForkEvent":
          forkSummary.add(repoName);
          break;

        case "PullRequestEvent": {
          const action = event.payload.action || "opened";
          const prKey = (action === "closed" && event.payload.pull_request?.merged) ? "merged" : action;
          if (!prSummary[repoName]) prSummary[repoName] = {};
          prSummary[repoName][prKey] = (prSummary[repoName][prKey] || 0) + 1;
          break;
        }

        case "IssueCommentEvent":
          commentSummary[repoName] = (commentSummary[repoName] || 0) + 1;
          break;

        default: {
          const formattedType = event.type.replace("Event", "");
          if (!otherSummary[formattedType]) otherSummary[formattedType] = new Set();
          otherSummary[formattedType].add(repoName);
          break;
        }
      }
    });

    // Print summaries in a structured format
    // Pushes
    for (const [repoName, commits] of Object.entries(pushSummary)) {
      console.log(`- Pushed ${commits} commit(s) to ${repoName}`);
    }

    // Issues
    for (const [repoName, actions] of Object.entries(issueSummary)) {
      for (const [action, count] of Object.entries(actions)) {
        console.log(`- ${action.charAt(0).toUpperCase() + action.slice(1)} ${count} issue(s) in ${repoName}`);
      }
    }

    // Stars
    for (const repoName of watchSummary) {
      console.log(`- Starred ${repoName}`);
    }

    // Repository / branch / tag creations
    for (const [repoName, refTypes] of Object.entries(createSummary)) {
      for (const [refType, count] of Object.entries(refTypes)) {
        if (refType === "repository") {
          console.log(`- Created a new repository: ${repoName}`);
        } else {
          console.log(`- Created ${count} ${refType}(s) in ${repoName}`);
        }
      }
    }

    // Deletes
    for (const [repoName, refTypes] of Object.entries(deleteSummary)) {
      for (const [refType, count] of Object.entries(refTypes)) {
        console.log(`- Deleted ${count} ${refType}(s) in ${repoName}`);
      }
    }

    // Forks
    for (const repoName of forkSummary) {
      console.log(`- Forked ${repoName}`);
    }

    // Pull Requests
    for (const [repoName, actions] of Object.entries(prSummary)) {
      for (const [action, count] of Object.entries(actions)) {
        if (action === "merged") {
          console.log(`- Merged ${count} pull request(s) in ${repoName}`);
        } else {
          console.log(`- ${action.charAt(0).toUpperCase() + action.slice(1)} ${count} pull request(s) in ${repoName}`);
        }
      }
    }

    // Comments
    for (const [repoName, count] of Object.entries(commentSummary)) {
      console.log(`- Commented ${count} time(s) on issues/PRs in ${repoName}`);
    }

    // Others
    for (const [type, repos] of Object.entries(otherSummary)) {
      for (const repoName of repos) {
        console.log(`- Action [${type}] in ${repoName}`);
      }
    }
  } catch (error: any) {
    console.error("Error fetching GitHub user activity:", error.message || error);
  }
}

main();
