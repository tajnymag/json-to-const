import { appendFileSync, writeFileSync } from 'fs';
import { resolve as resolvePath, parse as parsePath } from 'path';

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

function capitalize(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function toConstName(str: string) {
	return str
		.split(/[^\w]/)
		.filter((part) => part)
		.map(capitalize)
		.join('');
}

yargs(hideBin(process.argv))
	.command(
		'$0 <input...>',
		'Converts JSON to TypeScript const',
		(yargs) =>
			yargs
				.positional('input', {
					type: 'string',
					description: 'JSON file[s] to convert',
					array: true,
					demandOption: true,
				})
				.options({
					output: {
						alias: 'o',
						default: 1,
						type: 'string',
						description: 'Output file',
					},
					'naming-strategy': {
						choices: ['from_file_name', 'from_file_content'] as const,
						default: 'from_file_name',
						description: 'How to infer the name of the const',
					},
					postfix: {
						default: '',
						type: 'string',
						description: 'Postfix to add to the const name',
					},
					prefix: {
						default: '',
						type: 'string',
						description: 'Prefix to add to the const name',
					},
				}),
		(argv) => {
			try {
				writeFileSync(argv.output, '');
			} catch (err) {
				console.error(`Failed to write to ${argv.output}`);
				process.exit(1);
			}

			for (const file of argv.input) {
				try {
					const filePath = resolvePath(file);
					const json = require(filePath);

					let rawName;

					if (argv.namingStrategy === 'from_file_name') {
						const { name: fileName } = parsePath(filePath);
						rawName = fileName;
					} else if (argv.namingStrategy === 'from_file_content') {
						const jsonName = json.name;
						if (!jsonName) {
							console.error('Attribute "name" not found in JSON file');
							process.exit(1);
						}
						rawName = jsonName;
					} else {
						console.error('Invalid naming inference argument');
						process.exit(1);
					}

					const name = toConstName(rawName);

					const output = `export const ${name} = ${JSON.stringify(json)} as const;\n`;
					appendFileSync(argv.output, output);
				} catch (err) {
					if (err instanceof TypeError) {
						console.error(`File "${file}" not found`);
					} else if (err instanceof SyntaxError) {
						console.error(`File "${file}" is not a valid JSON`);
					} else if (err instanceof Error) {
						console.error(`Error while processing file "${file}": ${err.message}`);
					} else {
						console.error(`Error while processing file "${file}"`);
					}
					process.exit(1);
				}
			}
		}
	)
	.parseSync();
