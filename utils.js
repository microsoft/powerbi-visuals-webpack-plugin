module.exports = {
	populateErrors: (errors, fileName, type) => {
		if (!errors || errors.length) return;

		return errors.map((e) => ({
			filename: fileName,
			message: e.stack || "Unknown error",
			type: type,
		}));
	},

	compareVersions: (versionA, versionB) => {
		//if versionA >= versionB, return true, else return false
		let a = versionA.split(".").map(parseFloat);
		let b = versionB.split(".").map(parseFloat);

		let versionParts = Math.max(a.length, b.length);

		for (let i = 0; i < versionParts; i++) {
			let partA = a[i] || 0;
			let partB = b[i] || 0;

			if (partA > partB) return true;

			if (partA < partB) return false;
		}

		return true;
	},
};
