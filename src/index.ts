import type { PGlite } from "@electric-sql/pglite";
import type { DriverCommand, DriverFactory } from "@slonik/driver";
import { createDriverFactory } from "@slonik/driver";

export const createPGLiteDriverFactory = (pg: PGlite): DriverFactory =>
	createDriverFactory(async () => ({
		async createPoolClient({ clientEventEmitter }) {
			let connected = false;

			const connect = async () => {
				if (!connected) {
					connected = true;
				}
			};

			const end = async () => {
				if (connected) {
					connected = false;
				}
			};

			const query = async (sql: string, values?: unknown[]) => {
				try {
					const result = await pg.query(sql, values ?? []);

					const rows: any[] = (result as any).rows ?? [];
					const rowCount: number =
						(result.rows.length ? result.rows.length : result.affectedRows) ??
						0;

					return {
						command: (result as any).command as DriverCommand,
						fields: result.fields.map((field) => ({
							dataTypeId: field.dataTypeID,
							name: field.name,
						})),
						rowCount,
						rows,
					};
				} catch (error) {
					clientEventEmitter.emit("error", error);
					throw error;
				}
			};

			const stream = (_: string, __?: unknown[]) => {
				throw new Error("PGlite driver: stream() is not supported yet.");
			};

			return {
				connect,
				end,
				query,
				stream,
			};
		},
	}));
