import * as fs from 'fs';
import * as path from 'path';
import { validateProject } from '../validator';

jest.mock('fs');

describe('Audit Command - validateProject', () => {
  const mockMfs = fs as jest.Mocked<typeof fs>;
  const mockProjectPath = '/mock/project/path';

  const createMockDirent = (name: string, isDirectory: boolean): fs.Dirent => {
    return {
      name,
      isDirectory: () => isDirectory,
      isFile: () => !isDirectory,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false,
    } as fs.Dirent;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass validation with no findings for a perfectly valid project configuration', () => {
    const validTheneoJson = JSON.stringify({
      id: 'proj_123',
      name: 'Valid Project Test API',
      tabs: [
        { title: 'Guides Layout', slug: 'guides' },
        { title: 'API Reference Layout', slug: 'api-reference' }
      ],
      sections: [
        {
          title: 'Introduction Section',
          slug: 'intro',
          children: []
        },
        {
          title: 'Environment Setup',
          slug: 'setup',
          children: []
        }
      ]
    });

    const validSectionJsonIntro = JSON.stringify({
      title: 'Introduction Section',
      slug: 'intro'
    });

    const validSectionJsonSetup = JSON.stringify({
      title: 'Environment Setup',
      slug: 'setup',
      endpoints: {
        method: 'POST'
      }
    });

    const filesMap: Record<string, string> = {
      [mockProjectPath]: 'directory',
      [path.join(mockProjectPath, 'theneo.json')]: validTheneoJson,
      [path.join(mockProjectPath, 'intro')]: 'directory',
      [path.join(mockProjectPath, 'intro', 'section.json')]: validSectionJsonIntro,
      [path.join(mockProjectPath, 'intro', 'index.md')]: '\n# Introduction to the API Docs',
      [path.join(mockProjectPath, 'setup')]: 'directory',
      [path.join(mockProjectPath, 'setup', 'section.json')]: validSectionJsonSetup,
      [path.join(mockProjectPath, 'setup', 'index.md')]: '\n# Setting up environments'
    };

    mockMfs.existsSync.mockImplementation((p: fs.PathLike) => {
      const normalizedPath = path.normalize(p.toString());
      return Object.prototype.hasOwnProperty.call(filesMap, normalizedPath);
    });

    mockMfs.readdirSync.mockImplementation((p: fs.PathLike) => {
      const targetPath = path.normalize(p.toString());

      if (targetPath === mockProjectPath) {
        return [
          createMockDirent('theneo.json', false),
          createMockDirent('intro', true),
          createMockDirent('setup', true)
        ] as any;
      }
      if (targetPath === path.join(mockProjectPath, 'intro')) {
        return [
          createMockDirent('section.json', false),
          createMockDirent('index.md', false)
        ] as any;
      }
      if (targetPath === path.join(mockProjectPath, 'setup')) {
        return [
          createMockDirent('section.json', false),
          createMockDirent('index.md', false)
        ] as any;
      }
      return [] as any;
    });

    mockMfs.readFileSync.mockImplementation((p: fs.PathLike | number) => {
      const targetPath = path.normalize(p.toString());
      if (filesMap[targetPath] && filesMap[targetPath] !== 'directory') {
        return filesMap[targetPath];
      }
      throw new Error(`File not found in mock cache: ${targetPath}`);
    });

    const findings = validateProject(mockProjectPath);
    expect(findings).toEqual([]);
  });

  it('should flag a warning error if an index file references an undeclared workspace tab identifier slug', () => {
    const invalidTabTheneoJson = JSON.stringify({
      id: 'proj_456',
      name: 'Invalid Tab Test API',
      tabs: [{ title: 'Guides Layout', slug: 'guides' }],
      sections: [{ title: 'Introduction Section', slug: 'intro', children: [] }]
    });

    const validSectionJsonIntro = JSON.stringify({
      title: 'Introduction Section',
      slug: 'intro'
    });

    const filesMap: Record<string, string> = {
      [mockProjectPath]: 'directory',
      [path.join(mockProjectPath, 'theneo.json')]: invalidTabTheneoJson,
      [path.join(mockProjectPath, 'intro')]: 'directory',
      [path.join(mockProjectPath, 'intro', 'section.json')]: validSectionJsonIntro,
      [path.join(mockProjectPath, 'intro', 'index.md')]: ''
    };

    mockMfs.existsSync.mockImplementation((p: fs.PathLike) => {
      const normalizedPath = path.normalize(p.toString());
      return Object.prototype.hasOwnProperty.call(filesMap, normalizedPath);
    });

    mockMfs.readdirSync.mockImplementation((p: fs.PathLike) => {
      const targetPath = path.normalize(p.toString());
      if (targetPath === mockProjectPath) {
        return [
          createMockDirent('theneo.json', false),
          createMockDirent('intro', true)
        ] as any;
      }
      if (targetPath === path.join(mockProjectPath, 'intro')) {
        return [
          createMockDirent('section.json', false),
          createMockDirent('index.md', false)
        ] as any;
      }
      return [] as any;
    });

    mockMfs.readFileSync.mockImplementation((p: fs.PathLike | number) => {
      const targetPath = path.normalize(p.toString());
      if (filesMap[targetPath] && filesMap[targetPath] !== 'directory') {
        return filesMap[targetPath];
      }
      throw new Error(`File not found in mock cache: ${targetPath}`);
    });

    const findings = validateProject(mockProjectPath);

    expect(findings).toContainEqual(
      expect.objectContaining({
        rule: 'tabs/marker-invalid-slug',
        severity: 'error',
        path: path.join('intro', 'index.md')
      })
    );
  });
});
