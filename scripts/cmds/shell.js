const { exec } = require("child_process");

module.exports = {
	config: {
		name: "shell",
		aliases: ["sh"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		role: 2,
		usePrefix: true,
		description: {
			vi: "Thực thi lệnh shell",
			en: "Execute shell commands"
		},
		category: "admin",
		guide: {
			en: "{pn} <command>"
		}
	},

	langs: {
		vi: {
			needCmd: "❌ Hãy cung cấp lệnh cần thực thi",
			error: "❌ Lỗi khi thực thi:\n%1",
			stderr: "❌ Lệnh trả về lỗi:\n%1",
			success: "✅ Thực thi thành công:\n%1"
		},
		en: {
			needCmd: "❌ Please provide a command to execute",
			error: "❌ An error occurred while executing the command:\n%1",
			stderr: "❌ Command execution resulted in an error:\n%1",
			success: "✅ Command executed successfully:\n%1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const command = args.join(" ");
		if (!command) {
			return message.reply(getLang("needCmd"));
		}

		exec(command, (error, stdout, stderr) => {
			if (error) {
				return message.reply(getLang("error", error.message));
			}
			if (stderr) {
				return message.reply(getLang("stderr", stderr));
			}
			message.reply(getLang("success", stdout));
		});
	}
};
