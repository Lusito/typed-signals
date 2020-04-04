module.exports = {
    extends: ["@lusito/eslint-config"],
    rules: {},
    overrides: [
        {
            files: ["*.spec.{ts,tsx}", "src/testUtils.ts"],
            rules: {
                "max-classes-per-file": "off",
            },
        },
    ],
};
