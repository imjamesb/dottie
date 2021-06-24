export type ID = string;

export interface File {
  id: ID;
  path: string;
  profile: ID;
  mode: number;
}

export interface Profile {
  id: ID;
  name: string;
  files: File[];
}

// -----

export interface DotInitOpts {
  force: boolean;
  branchName: string;
  verbose: boolean | number;
  password?: string;
  storePlainPassword?: boolean;
  remote: string;
}
