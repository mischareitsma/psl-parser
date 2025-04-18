import { describe, test, before } from "node:test";
import * as assert from "node:assert/strict";

import * as path from "path";
import { MemberClass, ParsedDocument, parseFile } from "../src";
import { FinderPaths } from "../src/config";
import * as tokenizer from "../src/tokenizer";
import * as utilities from "../src/utilities";

function getTokens(str: string): tokenizer.Token[] {
	return [...tokenizer.getTokens(str)];
}

describe("completion", () => {
	test("empty", () => {
		const tokensOnLine: tokenizer.Token[] = [];
		const index = 0;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result.length, 0);
	});
	test("undefined", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a()");
		const index = 1;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result.length, 0);
	});
	test("undefined 2", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a()");
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result.length, 0);
	});
	test("undefined 3", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a ");
		const index = 1;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result.length, 0);
	});
	test("basic dot", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a.b");
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, "b");
	});
	test("two dots", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a.b.c");
		const index = 4;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, "b");
		assert.strictEqual(result[2].value, "c");
	});
	test("single reference", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("do a()");
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
	});
	test("dot with parens", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a().b");
		const index = 4;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, "b");
	});
	test("dot with parens content", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a(blah).b");
		const index = 5;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, "b");
	});
	test("dot with parens content with parens", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a(blah(blah())).b");
		const index = 10;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, "b");
	});
	test("dot with parens content on dot", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a(blah).b");
		const index = 4;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, ".");
	});
	test("clusterDuck", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a.b().c(x(y)).d");
		const index = 14;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, "b");
		assert.strictEqual(result[2].value, "c");
		assert.strictEqual(result[3].value, "d");
	});
	test("clusterDuck2", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("a.b().c(x(y)).d");
		const index = 14;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "a");
		assert.strictEqual(result[1].value, "b");
		assert.strictEqual(result[2].value, "c");
		assert.strictEqual(result[3].value, "d");
	});
	test("mumps call label", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("method^CLASS()");
		const index = 0;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[1].value, "method");
		assert.strictEqual(result[0].value, "CLASS");
	});

	test("mumps call routine", () => {
		const tokensOnLine: tokenizer.Token[] = getTokens("method^CLASS()");
		const index = 2;
		const result = utilities.getCallTokens(tokensOnLine, index);
		assert.strictEqual(result[0].value, "CLASS");
	});
});

describe("ParsedDocFinder", async () => {
	let filesDir: string;

	let parentFilePath: string;
	let childFilePath: string;

	let parsedParent: ParsedDocument;
	let parsedChild: ParsedDocument;

	const getPaths = (activeRoutine: string): FinderPaths => {
		return {
			activeRoutine,
			corePsl: "",
			projectPsl: [filesDir],
			tables: [],
		};
	};

	before(async () => {
		filesDir = path.resolve("test", "files");

		parentFilePath = path.join(filesDir, "ZParent.PROC");
		childFilePath = path.join(filesDir, "ZChild.PROC");

		parsedParent = await parseFile(parentFilePath);
		parsedChild = await parseFile(childFilePath);
	});

	test("Find dummy in child", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(finder, "dummy", { character: 0, line: 0 });
		assert.strictEqual(result.member.memberClass, MemberClass.property);
		assert.strictEqual(result.member.id.value, "dummy");
		assert.strictEqual(result.fsPath, childFilePath);
	});

	test("Find property in child", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(finder, "propInChild", { character: 0, line: 0 });
		assert.strictEqual(result.member.memberClass, MemberClass.property);
		assert.strictEqual(result.member.id.value, "propInChild");
		assert.strictEqual(result.fsPath, childFilePath);
	});

	test("Find method in child", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(
			finder,
			"methodInChild",
			{ character: 0, line: 0 }
		);
		assert.strictEqual(result.member.memberClass, MemberClass.method);
		assert.strictEqual(result.member.id.value, "methodInChild");
		assert.strictEqual(result.fsPath, childFilePath);
	});

	test("Find method overridden method in child", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(
			finder,
			"methodInParentAndChild",
			{ character: 0, line: 0 }
		);
		assert.strictEqual(result.member.memberClass, MemberClass.method);
		assert.strictEqual(result.member.id.value, "methodInParentAndChild");
		assert.strictEqual(result.fsPath, childFilePath);
	});

	test("Find method inherited method in parent", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(
			finder,
			"methodInParent",
			{ character: 0, line: 0 }
		);
		assert.strictEqual(result.member.memberClass, MemberClass.method);
		assert.strictEqual(result.member.id.value, "methodInParent");
		assert.strictEqual(result.fsPath, parentFilePath);
	});

	test("Find method in parent", async () => {
		const paths = getPaths(parentFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedParent,
			paths
		);
		const result = await searchParser(
			finder,
			"methodInParent",
			{ character: 0, line: 0 }
		);
		assert.strictEqual(result.member.memberClass, MemberClass.method);
		assert.strictEqual(result.member.id.value, "methodInParent");
		assert.strictEqual(result.fsPath, parentFilePath);
	});

	test("Find y in methodInChild", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(finder, "y", { character: 0, line: 12 });
		assert.strictEqual(result.member.memberClass, MemberClass.declaration);
		assert.strictEqual(result.member.id.value, "y");
		assert.strictEqual(result.fsPath, childFilePath);
	});

	test("Do not find x", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(finder, "x", { character: 0, line: 12 });
		assert.strictEqual(result, null);
	});

	test("Do not find reallySpecificName", async () => {
		const paths = getPaths(childFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedChild,
			paths
		);
		const result = await searchParser(
			finder,
			"reallySpecificName",
			{ character: 0, line: 10 }
		);
		assert.strictEqual(result, null);
	});

	test("Do find reallySpecificName", async () => {
		const paths = getPaths(parentFilePath);
		const finder: utilities.ParsedDocFinder = new utilities.ParsedDocFinder(
			parsedParent,
			paths
		);
		const result = await searchParser(
			finder,
			"reallySpecificName",
			{ character: 0, line: 10 }
		);
		assert.strictEqual(result.member.memberClass, MemberClass.declaration);
		assert.strictEqual(result.member.id.value, "reallySpecificName");
		assert.strictEqual(result.fsPath, parentFilePath);
	});
});

function searchParser(
	finder: utilities.ParsedDocFinder,
	value: string,
	position: tokenizer.Position
) {
	return finder.searchParser(
		new tokenizer.Token(tokenizer.Type.Alphanumeric, value, position)
	);
}
