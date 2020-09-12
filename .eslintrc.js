module.exports = {
    extends: ["@lusito/eslint-config", "plugin:jest/recommended"],
    rules: {},
    overrides: [
        {
            files: ["*.spec.{ts,tsx}", "src/testUtils.ts"],
            rules: {
                "max-classes-per-file": "off",
            },
        },
    ],
    env: {
        "jest/globals": true,
    },
};
