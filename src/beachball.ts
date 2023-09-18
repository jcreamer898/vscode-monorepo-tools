import { getChangedPackages } from "beachball/lib/changefile/getChangedPackages";
import { readChangeFiles } from "beachball/lib/changefile/readChangeFiles";
import { getDefaultOptions } from "beachball/lib/options/getDefaultOptions";
import { getRepoOptions } from "beachball/lib/options/getRepoOptions";
import type {
  BeachballOptions,
  CliOptions,
} from "beachball/lib/types/BeachballOptions";
import { PackageInfos } from "beachball/lib/types/PackageInfo";
import { join } from "path";

/**
 * Gets all repo level options (default + root options + cli options)
 */
export function getOptions(
  cliOptions: Partial<BeachballOptions & CliOptions>
): BeachballOptions {
  let { path } = cliOptions;

  let workspaceBeachballConfig: Partial<BeachballOptions> = {};
  try {
    workspaceBeachballConfig = require(join(path!, "beachball.config.js"));
  } catch (e) {
    console.warn("No beachball.config.js found in workspace root");
  }

  return {
    ...getDefaultOptions(),
    ...getRepoOptions(cliOptions as any),
    ...cliOptions,
    ...workspaceBeachballConfig,
  };
}

export const checkChangeFiles = async ({
  workingDirectory,
  branch,
  packageInfos,
}: {
  workingDirectory: string;
  branch: string;
  packageInfos: PackageInfos;
}) => {
  const checkOptions = getOptions({
    command: "check",
    path: workingDirectory,
    // Beachball expects origin on these branch names otherwise it parses them incorrectly
    fromRef: branch,
    branch,
    // We do our own fetch to make sure we have the right branches (main, or midgard/versioned/release/v...) locally
    fetch: false,
    publish: true,
  });

  const result = await getChangedPackages(checkOptions, packageInfos);

  return result;
};

/**
 * Gets all the beachball change files in the repo from the ./changes folder
 * @param options
 * @param options.packageInfos
 * @param options.branch
 * @param options.workingDirectory
 * @returns
 */
export const getChangeFiles = async ({
  workingDirectory,
  branch,
  packageInfos,
}: {
  workingDirectory: string;
  branch: string;
  packageInfos: PackageInfos;
}) => {
  const checkOptions = getOptions({
    path: workingDirectory,
    // Beachball expects origin on these branch names otherwise it parses them incorrectly
    fromRef: branch,
    branch,
    // We do our own fetch to make sure we have the right branches (main, or midgard/versioned/release/v...) locally
    fetch: false,
  });

  return readChangeFiles(checkOptions, packageInfos);
};
