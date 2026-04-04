import type { ConnectionProfile } from "./types";

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

export function resolveTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(VAR_PATTERN, (match, key) => variables[key] ?? match);
}

export function hasVariables(text: string): boolean {
  return VAR_PATTERN.test(text);
}

export function extractVariableNames(text: string): string[] {
  const names: string[] = [];
  let match;
  const re = new RegExp(VAR_PATTERN.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

export function resolveProfile(
  profile: ConnectionProfile,
  variables: Record<string, string>,
): ConnectionProfile {
  return {
    ...profile,
    ssh_user: resolveTemplate(profile.ssh_user, variables),
    bastion_host: resolveTemplate(profile.bastion_host, variables),
    remote_host: profile.remote_host
      ? resolveTemplate(profile.remote_host, variables)
      : null,
    identity_file: resolveTemplate(profile.identity_file, variables),
    jump_hosts: profile.jump_hosts.map((jh) => ({
      ...jh,
      host: resolveTemplate(jh.host, variables),
      user: resolveTemplate(jh.user, variables),
    })),
  };
}
