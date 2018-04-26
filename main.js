/**
 * Objective:
 * I'd like to be able to see the history of a file, what lines were changed in which commit etc.
 */

const Git = require('simple-git');
const nodegit = require('nodegit');

const repos = {
	self: __dirname,
	iris: '/Users/dddom/Dev/iprimarycare/iris',
	lbx: '/Users/dddom/Dev/lbx/lbx-alphapoint-client',
	justin: '/Users/dddom/Dev/dominikwidomski/justin-bot'
}

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
	const repo = await nodegit.Repository.open(repos.self);
	// const currentBranch = await repo.getCurrentBranch();
	// const branchRef = await repo.getBranch('master');

	// const commit = await repo.getCommit(branchRef);

	// console.log(branchRef);
	// console.log(commit);
}

// main();
main2();