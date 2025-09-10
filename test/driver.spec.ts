import { PGlite } from "@electric-sql/pglite";
import { createPool, type DatabasePool, sql } from "slonik";
import { createPGLiteDriverFactory } from "slonik-pglite-driver";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("query", () => {
	let db: DatabasePool;

	beforeAll(async () => {
		const pglite = new PGlite();

		db = await createPool("postgresql://", {
			driverFactory: createPGLiteDriverFactory(pglite),
		});

		await db.query(sql.unsafe`drop table if exists test;`);

		await db.query(
			sql.unsafe`create table test (id serial primary key, name text);`,
		);
	});

	beforeEach(async () => {
		await db.query(sql.unsafe`truncate table test restart identity;`);
	});

	it("should run a select query", async () => {
		const {
			rows: [{ message }],
		} = await db.query(sql.unsafe`select 'Hello world' as message;`);

		expect(message).toEqual("Hello world");
	});

	it("should run an insert query", async () => {
		await db.query(
			sql.unsafe`insert into test (name) values ('Alice'), ('Bob'), ('Charlie');`,
		);

		const { rowCount } = await db.query(
			sql.unsafe`insert into test (name) values ('David');`,
		);

		expect(rowCount).toEqual(1);

		const { rows } = await db.query(
			sql.unsafe`select name from test order by id;`,
		);

		expect(rows.map((r) => r.name)).toEqual([
			"Alice",
			"Bob",
			"Charlie",
			"David",
		]);
	});

	it("should run a transaction", async () => {
		await db.query(
			sql.unsafe`insert into test (name) values ('Alice'), ('Bob'), ('Charlie'), ('David');`,
		);

		await db.transaction(async (trx) => {
			const {
				rows: [{ count }],
			} = await trx.query(sql.unsafe`select count(*)::int as count from test;`);

			expect(count).toEqual(4);

			await trx.query(
				sql.unsafe`insert into test (name) values ('Eve'), ('Frank');`,
			);

			const {
				rows: [{ new_count }],
			} = await trx.query(
				sql.unsafe`select count(*)::int as new_count from test;`,
			);

			expect(new_count).toEqual(6);
		});

		const {
			rows: [{ final_count }],
		} = await db.query(
			sql.unsafe`select count(*)::int as final_count from test;`,
		);

		expect(final_count).toBe(6);
	});

	it("should rollback transaction on error", async () => {
		await db.query(
			sql.unsafe`insert into test (name) values ('Alice'), ('Bob');`,
		);

		try {
			await db.transaction(async (trx) => {
				await trx.query(
					sql.unsafe`insert into test (name) values ('TempUser');`,
				);

				throw new Error("Force rollback");
			});
		} catch (e) {}

		const { rows } = await db.query(
			sql.unsafe`select name from test order by id;`,
		);

		expect(rows.map((r) => r.name)).toEqual(["Alice", "Bob"]);
	});

	it("should commit transaction and persist rows", async () => {
		await db.transaction(async (trx) => {
			await trx.query(
				sql.unsafe`insert into test (name) values ('User1'), ('User2');`,
			);
		});

		const { rows } = await db.query(
			sql.unsafe`select name from test order by id;`,
		);

		expect(rows.map((r) => r.name)).toEqual(["User1", "User2"]);
	});
});
