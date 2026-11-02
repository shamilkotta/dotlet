"use client";

import * as React from "react";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, List, Lock } from "lucide-react";
import Link from "next/link";

import { formatRelativeTimeVerbose } from "@/lib/format-relative-time";
import { CopyIsletNameButton } from "@/components/copy-islet-name-button";
import { Button } from "@workspace/ui/components/button";
import { buildIsletViewHref } from "@/lib/core/islet-link";
import { pathSegments, stripLeadingSlashes } from "@/lib/core/path";
import type { IsletRecord } from "@/components/device/islets";

type FolderNode = {
  kind: "folder";
  name: string;
  key: string;
  updatedAt: Date;
  children: TreeNode[];
};

type FileNode = { kind: "file"; name: string; updatedAt: Date; record: IsletRecord };

type TreeNode = FolderNode | FileNode;

type MutableFolder = {
  name: string;
  key: string;
  folders: Map<string, MutableFolder>;
  files: FileNode[];
};

const RELATIVE_SEGMENTS = new Set([".", ".."]);

function folderSegments(isletPath: string): { folders: string[]; fileName: string } {
  const segments = pathSegments(stripLeadingSlashes(isletPath));
  const fileName = segments.pop() ?? isletPath;
  const folders: string[] = [];
  let pendingPrefix = "";
  for (const segment of segments) {
    if (RELATIVE_SEGMENTS.has(segment)) {
      pendingPrefix += `${segment}/`;
      continue;
    }
    folders.push(pendingPrefix + segment);
    pendingPrefix = "";
  }
  return { folders, fileName: pendingPrefix + fileName };
}

function compareNodes(a: TreeNode, b: TreeNode) {
  const diff = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (diff !== 0) return diff;
  return a.name.localeCompare(b.name);
}

function freeze(folder: MutableFolder): FolderNode {
  const children: TreeNode[] = [...[...folder.folders.values()].map(freeze), ...folder.files].sort(
    compareNodes,
  );
  return {
    kind: "folder",
    name: folder.name,
    key: folder.key,
    updatedAt: children[0]!.updatedAt,
    children,
  };
}

function buildTree(records: IsletRecord[]): TreeNode[] {
  const root: MutableFolder = { name: "", key: "", folders: new Map(), files: [] };

  for (const record of records) {
    const { folders, fileName } = folderSegments(record.path);
    let current = root;
    for (const name of folders) {
      const key = current.key ? `${current.key}/${name}` : name;
      let next = current.folders.get(name);
      if (!next) {
        next = { name, key, folders: new Map(), files: [] };
        current.folders.set(name, next);
      }
      current = next;
    }
    current.files.push({ kind: "file", name: fileName, updatedAt: record.updatedAt, record });
  }

  if (root.folders.size === 0 && root.files.length === 0) return [];
  return freeze(root).children;
}

function flattenRecords(records: IsletRecord[]): FileNode[] {
  return records
    .map(
      (record): FileNode => ({
        kind: "file",
        name: stripLeadingSlashes(record.path),
        updatedAt: record.updatedAt,
        record,
      }),
    )
    .sort(compareNodes);
}

function collectFolderKeys(nodes: TreeNode[], keys: string[] = []): string[] {
  for (const node of nodes) {
    if (node.kind !== "folder") continue;
    keys.push(node.key);
    collectFolderKeys(node.children, keys);
  }
  return keys;
}

type TreeContext = {
  openKeys: ReadonlySet<string>;
  setFolderOpen: (key: string, open: boolean) => void;
  makeIsletHref: (isletPath: string) => string;
  getIsletName: (isletPath: string) => string;
};

function IsletRow({ node, context }: { node: FileNode; context: TreeContext }) {
  const { record } = node;
  return (
    <div className="group/islet grid grid-cols-1 md:grid-cols-12 gap-2 py-3">
      <div className="md:col-span-5 self-center">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={context.makeIsletHref(record.path)}
            className="text-sm font-medium text-[#1f2328] dark:text-[#e2e2e2] hover:text-[#57606a] dark:hover:text-white transition-colors truncate block min-w-0"
          >
            {node.name}
          </Link>
          {record.visibility !== "public" && <Lock className="size-3" />}
          <div className="opacity-0 transition-opacity group-hover/islet:opacity-100 group-focus-within/islet:opacity-100">
            <CopyIsletNameButton
              value={context.getIsletName(record.path)}
              ariaLabel={`Copy islet ${record.path}`}
            />
          </div>
        </div>
      </div>
      <div className="md:col-span-5 self-center text-xs text-[#57606a] dark:text-[#919191] italic line-clamp-1">
        {record.message?.trim() ? `"${record.message.trim()}"` : ""}
      </div>
      <div className="md:col-span-2 self-center text-right text-[10px] text-[#57606a] dark:text-[#919191] font-mono">
        {formatRelativeTimeVerbose(record.updatedAt)}
      </div>
    </div>
  );
}

function FolderRow({ node, context }: { node: FolderNode; context: TreeContext }) {
  return (
    <details
      className="group py-3"
      open={context.openKeys.has(node.key)}
      onToggle={(event) => {
        if (event.target !== event.currentTarget) return;
        context.setFolderOpen(node.key, event.currentTarget.open);
      }}
    >
      <summary className="flex cursor-pointer items-center gap-3 hover:text-neutral-500 transition-colors">
        <ChevronRight className="folder-icon size-4 transition-transform duration-200 text-[#57606a] dark:text-[#919191]" />
        <span className="text-sm font-semibold tracking-widest opacity-40">{node.name}/</span>
      </summary>
      <div className="islets-tree-content">
        <TreeLevel nodes={node.children} context={context} />
      </div>
    </details>
  );
}

function TreeLevel({ nodes, context }: { nodes: TreeNode[]; context: TreeContext }) {
  return (
    <div className="divide-y divide-foreground/5">
      {nodes.map((node) =>
        node.kind === "folder" ? (
          <FolderRow key={`dir:${node.key}`} node={node} context={context} />
        ) : (
          <IsletRow key={node.record.path} node={node} context={context} />
        ),
      )}
    </div>
  );
}

export function IsletsTree({
  records,
  username,
  deviceName,
}: {
  records: IsletRecord[];
  username: string;
  deviceName: string;
}) {
  const [flat, setFlat] = React.useState(false);
  const fullTree = React.useMemo(() => buildTree(records), [records]);
  const flatList = React.useMemo(() => flattenRecords(records), [records]);
  const allKeys = React.useMemo(() => collectFolderKeys(fullTree), [fullTree]);
  const [openKeys, setOpenKeys] = React.useState<ReadonlySet<string>>(() => {
    const firstFolder = fullTree.find((node) => node.kind === "folder");
    return new Set(firstFolder ? [firstFolder.key] : []);
  });

  const allOpen = allKeys.every((key) => openKeys.has(key));

  const context: TreeContext = {
    openKeys,
    setFolderOpen: (key, open) =>
      setOpenKeys((prev) => {
        if (prev.has(key) === open) return prev;
        const next = new Set(prev);
        if (open) next.add(key);
        else next.delete(key);
        return next;
      }),
    makeIsletHref: (isletPath) => buildIsletViewHref({ username, deviceName, isletPath }),
    getIsletName: (isletPath) =>
      `${process.env.NEXT_PUBLIC_APP_URL}/${username}/${deviceName}/islet?n=${encodeURIComponent(isletPath)}`,
  };

  return (
    <div className="space-y-0">
      {allKeys.length > 0 && (
        <div className="flex justify-end gap-1 pb-2">
          <Button
            variant={flat ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={flat}
            onClick={() => setFlat((value) => !value)}
          >
            <List />
            Flat list
          </Button>
          {!flat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpenKeys(new Set(allOpen ? [] : allKeys))}
            >
              {allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
              {allOpen ? "Collapse all" : "Expand all"}
            </Button>
          )}
        </div>
      )}
      <div className="border-b border-foreground/5">
        <TreeLevel nodes={flat ? flatList : fullTree} context={context} />
      </div>
    </div>
  );
}
