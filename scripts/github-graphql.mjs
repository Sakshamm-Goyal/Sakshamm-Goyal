const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_GRAPHQL_ERROR = /something went wrong while executing your query|internal server error|temporarily unavailable|service unavailable/i;

const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function formatGraphQLErrors(errors) {
  return errors.map(({ message }) => message || "Unknown GitHub GraphQL error").join("; ");
}

export async function queryGitHubGraphQL({
  token,
  query,
  variables,
  fetchImpl = fetch,
  sleep = defaultSleep,
  maxAttempts = 3,
}) {
  if (!token) {
    throw new Error("GITHUB_TOKEN is required to refresh profile metrics.");
  }

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let retryable = false;

    try {
      const response = await fetchImpl("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "sakshamm-goyal-profile-metrics",
        },
        body: JSON.stringify({ query, variables }),
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        lastError = new Error(`GitHub GraphQL request returned an unreadable response: ${response.status} ${response.statusText}`);
        retryable = RETRYABLE_STATUS_CODES.has(response.status);
      }

      if (payload) {
        if (!response.ok) {
          lastError = new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
          retryable = RETRYABLE_STATUS_CODES.has(response.status);
        } else if (payload.errors?.length) {
          lastError = new Error(formatGraphQLErrors(payload.errors));
          retryable = payload.errors.some(({ message }) => TRANSIENT_GRAPHQL_ERROR.test(message || ""));
        } else if (!payload.data) {
          lastError = new Error("GitHub GraphQL response did not include data.");
        } else {
          return payload.data;
        }
      }
    } catch (error) {
      lastError = error;
      retryable = true;
    }

    if (!retryable || attempt === maxAttempts) {
      throw lastError;
    }

    const delayMilliseconds = 1_000 * 2 ** (attempt - 1);
    console.warn(`GitHub GraphQL transient failure (attempt ${attempt}/${maxAttempts}); retrying in ${delayMilliseconds}ms.`);
    await sleep(delayMilliseconds);
  }

  throw lastError;
}
