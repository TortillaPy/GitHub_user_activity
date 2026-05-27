# GitHub Activity CLI

A lightweight command-line interface tool to fetch and display recent GitHub activity for any public user directly from your terminal. Built with native Node.js, TypeScript, and ES Modules—zero external HTTP libraries, pure Node.js `https` module.

## Technologies Used

| Technology | Purpose |
|---|---|
| **TypeScript** | Type-safe development with strict inference |
| **Node.js (Native Modules)** | HTTP requests via native `https` module |
| **ES Modules** | Modern module system for clean, scalable code |
| **tsx** | Fast TypeScript execution in the CLI |

## Installation and Usage

### Prerequisites
- **Node.js** v18+ (with ES Modules support)
- **npm** v9+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/github-user-activity.git
cd github-user-activity

# Install dependencies
npm install
```

### Running the CLI

```bash
# Fetch recent activity for a GitHub user
npm start <username>

# Example
npm start torvalds
```

**Output example:**
```
Recent activity found for user torvalds:

- Pushed 5 commit(s) to torvalds/linux
- Opened a new issue in torvalds/linux
- Pushed 2 commit(s) to torvalds/subsurface
- Starred greatprojects/awesome-repo
```

The CLI displays the user's recent GitHub activity in a clean, chronological format—including pushes, issues, stars, and repository creations.

---

## Key Security Learnings

### 1. **Input Validation & Sanitization**

One of the most critical security practices in any application is **validating and sanitizing user input before using it** to construct external API requests. This project implements robust input validation using **Regular Expressions (Regex)**.

#### Why This Matters
- Prevents **injection attacks** where malformed usernames could corrupt API URLs
- Ensures API requests are well-formed and predictable
- Provides early feedback to users with invalid input

#### Implementation

```typescript
// Strict regex validation for GitHub usernames
const githubUsernameRegex =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

if (!githubUsernameRegex.test(username)) {
  console.error("Invalid GitHub username.");
  process.exit(1);
}
```

**GitHub Username Rules:**
- Must start and end with alphanumeric characters
- Can contain hyphens in the middle
- Maximum 39 characters
- Cannot contain special characters, spaces, or symbols

By validating **before** constructing the API URL, we follow the **defense-in-depth** principle—catching errors at the earliest point possible.

---

### 2. **Required HTTP Headers**

When making API requests, **proper HTTP headers** are not optional—they're essential for both **functionality and security**:

```typescript
const options = {
  hostname: 'api.github.com',
  path: `/users/${username}/events`,
  method: 'GET',
    headers: {
      'User-Agent': 'GitHub-User-Activity-App',
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
};
```

#### Why Each Header Matters

| Header | Purpose | Security Impact |
|---|---|---|
| **User-Agent** | Identifies your application | GitHub requires this; helps with rate limiting tracking and request logging |
| **Accept** | Specifies desired response format | Ensures consistent JSON structure; prevents unexpected content-type responses |
| **X-GitHub-Api-Version** | Pins the API version | Guarantees consistent behavior; prevents breaking changes from GitHub updates |

#### Best Practices
- **Always set a descriptive User-Agent** (GitHub may block requests without it)
- **Pin your API version explicitly** (prevents surprises from GitHub API evolution)
- **Use HTTPS exclusively** (all traffic is encrypted and authenticated by default with Node's `https` module)

---

## Technical Challenges Resolved

### Event Type Handling & Real-Time Activity Parsing

GitHub's Events API returns diverse event types, each requiring different handling strategies. This project implements a **type-based event dispatcher** to parse and display user activity accurately.

#### Supported Event Types

The CLI intelligently handles multiple event types:

```typescript
switch (event.type) {
  case "PushEvent":
    const commits = event.payload.commits?.length || 0;
    console.log(`- Pushed ${commits} commit(s) to ${repoName}`);
    break;

  case "IssuesEvent":
    const action = event.payload.action;
    const issueNum = event.payload.issue?.number ? ` #${event.payload.issue.number}` : "";
    console.log(`- ${action.charAt(0).toUpperCase() + action.slice(1)} an issue${issueNum} in ${repoName}`);
    break;

  case "WatchEvent":
    console.log(`- Starred ${repoName}`);
    break;

  case "CreateEvent":
    const refType = event.payload.ref_type;
    if (refType === "repository") {
      console.log(`- Created a new repository: ${repoName}`);
    } else {
      console.log(`- Created ${refType} '${event.payload.ref || ""}' in ${repoName}`);
    }
    break;

  case "DeleteEvent":
    console.log(`- Deleted ${event.payload.ref_type} '${event.payload.ref || ""}' in ${repoName}`);
    break;

  case "ForkEvent":
    console.log(`- Forked ${repoName}`);
    break;

  case "PullRequestEvent":
    const prAction = event.payload.action;
    const prNum = event.payload.pull_request?.number ? ` #${event.payload.pull_request.number}` : "";
    if (prAction === "closed" && event.payload.pull_request?.merged) {
      console.log(`- Merged pull request${prNum} in ${repoName}`);
    } else {
      console.log(`- ${prAction.charAt(0).toUpperCase() + prAction.slice(1)} pull request${prNum} in ${repoName}`);
    }
    break;

  case "IssueCommentEvent":
    console.log(`- Commented on an issue in ${repoName}`);
    break;
}
```

#### Why This Pattern Matters

**Type Safety** — Different events have different payload structures  
**Meaningful Context** — Displays human-readable descriptions of each action  
**Selective Filtering** — Only logs relevant details (e.g., "opened" issues, not closed ones)  
**Scalability** — Easy to add new event types as needed  

#### Real-World Behavior

**PushEvent peculiarity:** The `payload.commits` array can be undefined or contain `0` commits even for legitimate pushes due to:
- Branch synchronization without new commits
- Tag creation/deletion operations  
- Merge operations via the GitHub web UI
- Force pushes that rewrite history

Accessing `.length` directly on `payload.commits` when it is undefined causes a runtime `TypeError`. The implementation safely handles this using optional chaining (`event.payload.commits?.length || 0`), ensuring the UI displays "0 commit(s)" instead of crashing or raising error values.  

---

## � Acknowledgments

This project is part of the **[roadmap.sh](https://roadmap.sh/)** curriculum. You can find the full project specification and requirements at:

**[GitHub User Activity - roadmap.sh](https://roadmap.sh/projects/github-user-activity)**

roadmap.sh provides an excellent collection of project-based learning paths to help developers build real-world skills through hands-on projects.

---

## License

MIT License — feel free to use, modify, and distribute this project.

## Contributing

Found a bug? Have a feature idea? Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with ❤️ and TypeScript | No external HTTP libraries • Pure Node.js**
