const inquirer = require('inquirer');
const chalk = require('chalk');
const simpleGit = require('simple-git');
const path = require('path');
const { execSync } = require('child_process');

const REPO_PATH = path.join(__dirname, '..');
const git = simpleGit(REPO_PATH);

function log(msg) { console.log(msg); }
function ok(msg)  { log(chalk.green('✓ ' + msg)); }
function err(msg) { log(chalk.red('✗ ' + msg)); }
function info(msg){ log(chalk.cyan('→ ' + msg)); }

async function getCurrentBranch() {
  const status = await git.status();
  return status.current;
}

async function startSession(user) {
  log(chalk.yellow('\nPulling latest from GitHub...'));
  try {
    await git.checkout('main');
    await git.pull('origin', 'main');
    ok('Up to date with GitHub');
  } catch (e) {
    err('Could not pull. Check your internet or GitHub access.');
    process.exit(1);
  }

  const { desc } = await inquirer.prompt([{
    type: 'input',
    name: 'desc',
    message: 'What are you working on? (short description, no spaces):',
    default: 'session'
  }]);

  const branch = `${user}/${desc}`;
  try {
    await git.checkoutLocalBranch(branch);
    ok(`Branch created: ${branch}`);
  } catch (e) {
    await git.checkout(branch);
    ok(`Resumed branch: ${branch}`);
  }

  log(chalk.bold.green('\n✓ Ready! Open Claude Code and start working.\n'));
}

async function endSession() {
  const branch = await getCurrentBranch();

  if (branch === 'main') {
    err('You are on main — nothing to commit. Did you run "Start Session"?');
    return;
  }

  const status = await git.status();
  if (status.files.length === 0) {
    info('No changes to save.');
    return;
  }

  const { msg } = await inquirer.prompt([{
    type: 'input',
    name: 'msg',
    message: 'Describe what you changed:',
    default: 'WIP'
  }]);

  await git.add('.');
  await git.commit(msg);
  await git.push('origin', branch);
  ok(`Saved and pushed to GitHub: ${branch}`);
  log(chalk.yellow('\nTell the other person to review your branch before merging to main.\n'));
}

async function checkStatus() {
  const branch = await getCurrentBranch();
  const status = await git.status();
  log(chalk.bold('\n--- Current Status ---'));
  info(`Branch: ${branch}`);
  info(`Changed files: ${status.files.length}`);
  if (status.behind > 0) log(chalk.red(`⚠ You are ${status.behind} commit(s) behind GitHub`));
  else ok('You are up to date');
  log('');
}

async function main() {
  const user = process.argv[2];
  if (!user) {
    err('No user specified. Use start.bat or cassie.bat to launch.');
    process.exit(1);
  }

  log(chalk.bold.blue(`\n=== Wires R Us Sync — ${user} ===\n`));

  await checkStatus();

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What do you want to do?',
    choices: [
      { name: 'Start Session  (pull latest + create branch)', value: 'start' },
      { name: 'End Session    (save + push your work)',       value: 'end'   },
      { name: 'Check Status',                                 value: 'status'},
      { name: 'Exit',                                         value: 'exit'  }
    ]
  }]);

  switch (action) {
    case 'start':  await startSession(user); break;
    case 'end':    await endSession(); break;
    case 'status': await checkStatus(); break;
    case 'exit':   break;
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
