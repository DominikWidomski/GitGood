#!/usr/bin/env node

const Table = require('cli-table2');
const inquirer = require('inquirer');

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });

/**
 * Objective:
 * I'd like to be able to see the history of a file, what lines were changed in which commit etc.
 * 
 * TODO:
 * - [ ] Simple mapping to the commands, accepting arguments from process
 * 		- [ ] Add, Commit
 * 		- [ ] Rebase
 * 		- [ ] Auto fixup
 */

/**
 * Status is actually some enum numbers from C lib
 * https://libgit2.github.com/libgit2/#HEAD/type/git_status_t
 * https://github.com/nodegit/nodegit/blob/78765bf811b35c4539f83f3b57d10a9333a7b3a3/lib/status_file.js#L78
 * https://gist.github.com/corymartin/2393268
 * http://www.alanzucconi.com/2015/07/26/enum-flags-and-bitwise-operators/
 * ... HOW TO WORK WITH THIS?
 * !!(FLAG & value)...
 * where to even get the flags?
 */

const mapStatus = status => ({
	CURRENT: 'current',
	INDEX_NEW: 'in index - new',
	INDEX_MODIFIED: 'in index - modified',
	INDEX_DELETED: 'in index - deleted',
	INDEX_RENAMED: 'in index - renamed',
	INDEX_TYPECHANGE: 'in index - typechange',
	WT_NEW: 'working dir - new',
	WT_MODIFIED: 'working dir - modified',
	WT_DELETED: 'working dir - deleted',
	WT_TYPECHANGE: 'working dir - typechange',
	WT_RENAMED: 'working dir - renamed',
	WT_UNREADABLE: 'working dir - unreadable',
	IGNORED: 'ignored',
	CONFLICTED: 'conflicted',
}[status]);

const outputFiles = statusFiles => {
	const table = new Table({
		head: ['status', 'file']
	});
	
	statusFiles.forEach(statusFile => {
		table.push([
			mapStatus(statusFile.status()),
			statusFile.path()
		]);
	});
	
	console.log(table.toString());
};

const filterIndexedFiles = statusFiles => {
	return statusFiles.filter(file => {
		return file.status().find(statusString => statusString.startsWith('INDEX_'));
	});
}

const filterWTFiles = statusFiles => {
	return statusFiles.filter(file => {
		return file.status().find(statusString => statusString.startsWith('WT_'));
	});
}

const showStatus = (statusFiles) => {
	console.log("STAGED");
	outputFiles(filterIndexedFiles(statusFiles));

	console.log("WORKING DIR");
	outputFiles(filterWTFiles(statusFiles));
}

const deconstructArguments = () => {
	const args = process.argv.slice(2);

	return args;
}

const arguments = deconstructArguments();

const Git = require('simple-git');
const nodegit = require('nodegit');
const codes = nodegit.Status.STATUS;
const Diff = nodegit.Diff;
const Commit = nodegit.Commit;

const repos = {
	// self: __dirname,
	self: process.cwd(),
	iris: '/Users/dddom/Dev/iprimarycare/iris',
	lbx: '/Users/dddom/Dev/lbx/lbx-alphapoint-client',
	justin: '/Users/dddom/Dev/dominikwidomski/justin-bot'
}

// Old main
async function main() {
	const repo = Git(repos.justin)

	let files = [];
	repo.status(function(err, status) { 
		console.log('status:', status);

		files = status.files;

		console.log('files:', files);

		const filePath = files[0].path
		console.log('first file:', filePath);

		repo.log({
			file: filePath
		}, function(err, log) {
			console.log(log.latest);
		})
	});

	// console.log(repo.constructor.prototype.tags.toString());
}

async function main2() {
	// Error handling, if no repo found
	// Also, complains about refs/heads/master not found initially
	// maybe a way of initialising the master branch if not there?
	// console.log('Opening repo:', repos.self);
	const repo = await nodegit.Repository.open(repos.self);
	const currentBranchRef = await repo.getCurrentBranch();
	const branchRef = await repo.getBranch(currentBranchRef);
	let statusFiles = await repo.getStatusExt();
	let index;

	// const commit = await repo.getCommit(branchRef);
	const commit = await repo.getMasterCommit();
	// const commit = await repo.getHeadCommit();

	// console.log(branchRef);
	// console.log(commit.message());
	
	showStatus(statusFiles);

	while(true) {
		index = await repo.refreshIndex();
		statusFiles = await repo.getStatusExt();

		const { action } = await inquirer.prompt([
			{
				message: "What do?",
				type: 'list',
				name: 'action',
				choices: ["add", "commit", "status"]
			}
		]);
		
		if (action === "status") {
			showStatus(statusFiles);
		} else if (action === "add") {
			let { files } = await inquirer.prompt([
				{
					message: "Which file?",
					type: "list",
					// type: "checkbox",
					name: "files",
					choices: filterWTFiles(statusFiles).map(statusFile => ({
						value: statusFile,
						name: statusFile.path(),
						short: statusFile.path(),
					}))
				}
			]);
			
			if (typeof files !== 'array') {
				files = [files];	
			}
			
			for(const statusFile of files) {
				// const diff = statusFile.indexToWorkdir();
				const result = await index.addByPath(statusFile.path());
				// console.log("Added:", statusFile.path(), result);
				
				// commit -> getDiff -> patches -> hunks:ConvenientHunk[] -> lines:DiffLine[]
				
				// await repo.stageLines(statusFile.path(), selectedDiffLines, false);
			};
			
			// Both needed?
			await index.write();
		} else if (action === "commit") {
			const oid = await index.writeTree();
			const headRef = await nodegit.Reference.nameToId(repo, "HEAD");
			const headCommit = await repo.getCommit(headRef);
			
			const time = (new Date()).getTime();
			var author = nodegit.Signature.create("Dominik Widomski", "dominik@digital-detox.co.uk", time, 60);
			var committer = nodegit.Signature.create("Dominik Widomski", "dominik@digital-detox.co.uk", time, 90);
			
			const { message } = await inquirer.prompt({
				type: 'editor',
				message: 'Commit messsage',
				name: 'message'
			});

			if (message.length === 0) {
				throw new Error("Please provide a commit message");
			}
			
			const commit = await repo.createCommit("HEAD", author, committer, message, oid, [headCommit]);
		}
	}
		
		// Questions
	// - [ ] Can I see what's in working dir / staging?
	// - [ ] Can I see that line by line?
	// - [ ] Can I see when those things were last modified?
	// - [ ] Can I commit line by line?
}

console.log("============ GIT GOOD ============");
// main();
main2();