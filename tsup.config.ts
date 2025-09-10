import { defineConfig, type Options } from "tsup";

export default defineConfig((opts) => {
	const config: Options = {
		entry: ["src/index.ts"],
		dts: true,
		shims: true,
		clean: true,
		platform: "node",
		removeNodeProtocol: false,
		external: ["@slonik/driver", "@electric-sql/pglite"],
	};

	const release: Options = {
		minify: "terser",
		treeshake: true,
		terserOptions: {
			compress: {
				passes: 3,
			},
		},
	};

	const dev: Options = {
		watch: true,
		sourcemap: true,
	};

	if (opts.env?.mode === "release") {
		Object.assign(config, release);
	}

	if (opts.env?.mode === "dev") {
		Object.assign(config, dev);
	}

	return config;
});
