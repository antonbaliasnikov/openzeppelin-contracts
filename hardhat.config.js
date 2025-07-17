/// ENVVAR
// - COMPILER:      compiler version (default: 0.8.27)
// - SOLX:          use solx compiler (default: false)
// - SRC:           contracts folder to compile (default: contracts)
// - RUNS:          number of optimization runs (default: 200)
// - IR:            enable IR compilation (default: false)
// - COVERAGE:      enable coverage report (default: false)
// - GAS:           enable gas report (default: false)
// - COINMARKETCAP: coinmarketcap api key for USD value in gas report
// - CI:            output gas report to file instead of stdout

const fs = require('fs');
const path = require('path');

const { argv } = require('yargs/yargs')()
  .env('')
  .options({
    // Compilation settings
    compiler: {
      alias: 'compileVersion',
      type: 'string',
      default: '0.8.30',
    },
    src: {
      alias: 'source',
      type: 'string',
      default: 'contracts',
    },
    runs: {
      alias: 'optimizationRuns',
      type: 'number',
      default: 200,
    },
    ir: {
      alias: 'enableIR',
      type: 'boolean',
      default: false,
    },
    evm: {
      alias: 'evmVersion',
      type: 'string',
      default: 'cancun',
    },
    // Extra modules
    coverage: {
      type: 'boolean',
      default: false,
    },
    gas: {
      alias: 'enableGasReport',
      type: 'boolean',
      default: false,
    },
    coinmarketcap: {
      alias: 'coinmarketcapApiKey',
      type: 'string',
    },
  });

require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-ethers');
require('hardhat-exposed');
require('hardhat-gas-reporter');
require('hardhat-ignore-warnings');
require('solidity-coverage');
require('solidity-docgen');

for (const f of fs.readdirSync(path.join(__dirname, 'hardhat'))) {
  require(path.join(__dirname, 'hardhat', f));
}

const { subtask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require('hardhat/builtin-tasks/task-names');

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (process.env.USE_SOLX === 'true') {
    console.log(`👾👾 Compiling with solx compiler 👾👾`);
    const compilerPath = process.env.SOLX;

    return {
      compilerPath,
      isSolcJs: false, // if you are using a native compiler, set this to false
      version: args.solcVersion,
      // This is used as extra information in the build-info files,
      // but other than that is not important
      longVersion: 'solx-0.1.0-0.8.30',
    };
  }

  // since we only want to override the compiler for version 0.8.30,
  // the runSuper function allows us to call the default subtask.
  return runSuper();
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: argv.compiler,
    settings: {
      optimizer: {
        enabled: true,
        runs: argv.runs,
      },
      evmVersion: argv.evm,
      viaIR: process.env.VIA_IR === 'true',
      outputSelection: { '*': { '*': ['storageLayout'] } },
    },
  },
  mocha: {
    reporter: 'json',
    reporterOptions: {
      output: process.env.JUNIT_REPORT, // Path to output json file
    },
  },
  warnings: {
    'contracts-exposed/**/*': {
      'code-size': 'off',
      'initcode-size': 'off',
    },
    '*': {
      'unused-param': !argv.coverage, // coverage causes unused-param warnings
      'transient-storage': false,
      default: 'error',
    },
  },
  networks: {
    hardhat: {
      hardfork: argv.evm,
      // Exposed contracts often exceed the maximum contract size. For normal contract,
      // we rely on the `code-size` compiler warning, that will cause a compilation error.
      allowUnlimitedContractSize: true,
      initialBaseFeePerGas: argv.coverage ? 0 : undefined,
      enableRip7212: true,
    },
  },
  exposed: {
    imports: true,
    initializers: true,
    exclude: ['vendor/**/*', '**/*WithInit.sol'],
  },
  gasReporter: {
    enabled: argv.gas,
    showMethodSig: true,
    includeBytecodeInJSON: true,
    currency: 'USD',
    coinmarketcap: argv.coinmarketcap,
  },
  paths: {
    sources: argv.src,
  },
  docgen: require('./docs/config'),
};
