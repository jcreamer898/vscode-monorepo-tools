import { getChangedPackages } from "beachball/lib/changefile/getChangedPackages";
import { getDefaultOptions } from "beachball/lib/options/getDefaultOptions";
import { getRepoOptions } from "beachball/lib/options/getRepoOptions";
import type {
  BeachballOptions,
  CliOptions,
} from "beachball/lib/types/BeachballOptions";
import path from "path";
import { PackageInfos } from "beachball/lib/types/PackageInfo";

/**
 * Gets all repo level options (default + root options + cli options)
 */
export function getOptions(
  cliOptions: Partial<BeachballOptions & CliOptions>
): BeachballOptions {
  return {
    ...getDefaultOptions(),
    ...getRepoOptions(cliOptions as any),
    ...cliOptions,
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
