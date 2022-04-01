import { existsSync, mkdirSync } from "fs";

export const config: WebdriverIO.Config = {
  baseUrl: process.env.NNS_DAPP_URL || "http://localhost:8080",

  before: (capabilities, spec) => {
    browser["screenshot-count"] = 0;
    browser["screenshots-taken"] = new Set();

    browser.addCommand("screenshot", async (name) => {
      const countStr: string = browser["screenshots-taken"].size
        .toFixed()
        .padStart(2, "0");
      if (browser["screenshots-taken"].has(name)) {
        throw Error(`A screenshot with this name was already taken: '${name}'`);
      }
      browser["screenshots-taken"].add(name);

      const SCREENSHOTS_DIR = "screenshots";
      if (!existsSync(SCREENSHOTS_DIR)) {
        mkdirSync(SCREENSHOTS_DIR);
      }

      await browser.saveScreenshot(
        `${SCREENSHOTS_DIR}/${countStr}-${name}.png`
      );
    });
  },

  afterTest: function (
    test,
    context,
    { error, result, duration, passed, retries }
  ) {
    // Take a screenshot anytime a test fails and throws an error.
    // Note: We could also use `result !== 0` or `passed === true`.
    //       The reason for conditioning on an error is that if
    //       no error is thrown, the code follows its normal flow
    //       so it is possible to take a screenshot in the test itself.
    //       This hook here captures "sudden" death that may be hard
    //       or tedious to capture otherwise.
    if (error) {
      // Filenames containing spaces are painful to work with on the command line,
      // so we replace any spaces in the test name when we create the screenshot.
      browser["screenshot"](`test-fail-${test.title.replace(/ /g, "-")}`);
    }
  },

  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: "tsconfig.json",
    },
  },
  specs: ["./specs/**/*.ts"],
  exclude: [],
  capabilities: [
    {
      browserName: "chrome",
      "goog:chromeOptions": {
        args: ["headless", "disable-gpu"],
      },
      acceptInsecureCerts: true,
    },
  ],
  logLevel: "warn",
  services: ["chromedriver"],

  framework: "mocha",
  reporters: ["spec"],

  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  maxInstances: 1,
};
