import assert from "node:assert/strict";
import test from "node:test";

import { queryGitHubGraphQL } from "./github-graphql.mjs";

test("retries a transient GitHub GraphQL execution error and returns the next successful payload", async () => {
  let calls = 0;
  const delays = [];

  const data = await queryGitHubGraphQL({
    token: "test-token",
    query: "query { viewer { login } }",
    variables: {},
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({
          errors: [{ message: "Something went wrong while executing your query" }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: { viewer: { login: "Sakshamm-Goyal" } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    sleep: async (milliseconds) => delays.push(milliseconds),
  });

  assert.deepEqual(data, { viewer: { login: "Sakshamm-Goyal" } });
  assert.equal(calls, 2);
  assert.deepEqual(delays, [1_000]);
});

test("does not retry a deterministic GitHub GraphQL error", async () => {
  let calls = 0;

  await assert.rejects(
    () => queryGitHubGraphQL({
      token: "test-token",
      query: "query { viewer { login } }",
      variables: {},
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify({ errors: [{ message: "Bad credentials" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      sleep: async () => assert.fail("deterministic errors must not be retried"),
    }),
    /Bad credentials/,
  );

  assert.equal(calls, 1);
});
