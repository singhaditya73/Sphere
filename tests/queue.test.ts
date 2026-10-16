import test from "node:test";
import assert from "node:assert/strict";

import { findDuplicateStream } from "../lib/queue.ts";

const queue = [
  { id: "s1", extractedId: "dQw4w9WgXcQ", played: false },
  { id: "s2", extractedId: "9bZkp7q19f0", played: false },
  { id: "s3", extractedId: "aaaaaaaaaaa", played: true },
];

test("findDuplicateStream detects an unplayed duplicate", () => {
  const duplicate = findDuplicateStream(queue, "dQw4w9WgXcQ");
  assert.equal(duplicate?.id, "s1");
});

test("findDuplicateStream allows re-adding a track that already played", () => {
  assert.equal(findDuplicateStream(queue, "aaaaaaaaaaa"), null);
});

test("findDuplicateStream returns null for new or empty ids", () => {
  assert.equal(findDuplicateStream(queue, "zzzzzzzzzzz"), null);
  assert.equal(findDuplicateStream(queue, ""), null);
  assert.equal(findDuplicateStream(queue, null), null);
  assert.equal(findDuplicateStream(queue, undefined), null);
});

test("findDuplicateStream handles an empty queue", () => {
  assert.equal(findDuplicateStream([], "dQw4w9WgXcQ"), null);
});
