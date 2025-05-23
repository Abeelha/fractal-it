export interface HTMLFeatures {
  tagCounts: Record<string, number>;
  classCounts: Record<string, number>;
  idCounts: Record<string, number>;
  attributeCounts: Record<string, number>;
  semanticStructure: {
    nestingDepth: number;
    semanticTags: string[];
    interactiveTags: string[];
    mediaTags: string[];
  };
  contentMetrics: {
    textLength: number;
    linkCount: number;
    imageCount: number;
    formElements: number;
  };
  domComplexity: {
    totalElements: number;
    uniqueTags: number;
    avgNestingLevel: number;
    maxNestingLevel: number;
  };
  colorPalette: string[];
  structuralHash: string;
}

export class HTMLAnalyzer {
  private semanticTags = [
    "header",
    "nav",
    "main",
    "section",
    "article",
    "aside",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "figure",
    "figcaption",
  ];

  private interactiveTags = [
    "button",
    "input",
    "select",
    "textarea",
    "a",
    "form",
    "label",
  ];

  private mediaTags = [
    "img",
    "video",
    "audio",
    "canvas",
    "svg",
    "picture",
    "source",
  ];

  analyze(html: string): HTMLFeatures {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    return {
      tagCounts: this.extractTagCounts(html),
      classCounts: this.extractClassCounts(html),
      idCounts: this.extractIdCounts(html),
      attributeCounts: this.extractAttributeCounts(html),
      semanticStructure: this.analyzeSemanticStructure(doc),
      contentMetrics: this.analyzeContentMetrics(doc),
      domComplexity: this.analyzeDOMComplexity(doc),
      colorPalette: this.extractColorPalette(html),
      structuralHash: this.generateStructuralHash(html),
    };
  }

  private extractTagCounts(html: string): Record<string, number> {
    const tagCounts: Record<string, number> = {};
    const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>/g;
    let match;

    while ((match = tagRegex.exec(html))) {
      const tag = match[1].toLowerCase();
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    return tagCounts;
  }

  private extractClassCounts(html: string): Record<string, number> {
    const classCounts: Record<string, number> = {};
    const classRegex = /class\s*=\s*["']([^"']*)["']/g;
    let match;

    while ((match = classRegex.exec(html))) {
      match[1].split(/\s+/).forEach((cls) => {
        if (cls.trim()) {
          classCounts[cls] = (classCounts[cls] || 0) + 1;
        }
      });
    }

    return classCounts;
  }

  private extractIdCounts(html: string): Record<string, number> {
    const idCounts: Record<string, number> = {};
    const idRegex = /id\s*=\s*["']([^"']*)["']/g;
    let match;

    while ((match = idRegex.exec(html))) {
      const id = match[1].trim();
      if (id) {
        idCounts[id] = (idCounts[id] || 0) + 1;
      }
    }

    return idCounts;
  }

  private extractAttributeCounts(html: string): Record<string, number> {
    const attributeCounts: Record<string, number> = {};
    const attrRegex = /(\w+)\s*=\s*["'][^"']*["']/g;
    let match;

    while ((match = attrRegex.exec(html))) {
      const attr = match[1].toLowerCase();
      attributeCounts[attr] = (attributeCounts[attr] || 0) + 1;
    }

    return attributeCounts;
  }

  private analyzeSemanticStructure(doc: Document) {
    const allElements = doc.querySelectorAll("*");
    const semanticTags = Array.from(allElements)
      .map((el) => el.tagName.toLowerCase())
      .filter((tag) => this.semanticTags.includes(tag));

    const interactiveTags = Array.from(allElements)
      .map((el) => el.tagName.toLowerCase())
      .filter((tag) => this.interactiveTags.includes(tag));

    const mediaTags = Array.from(allElements)
      .map((el) => el.tagName.toLowerCase())
      .filter((tag) => this.mediaTags.includes(tag));

    return {
      nestingDepth: this.calculateMaxNestingDepth(doc.body),
      semanticTags: [...new Set(semanticTags)],
      interactiveTags: [...new Set(interactiveTags)],
      mediaTags: [...new Set(mediaTags)],
    };
  }

  private analyzeContentMetrics(doc: Document) {
    const textLength = doc.body?.textContent?.length || 0;
    const linkCount = doc.querySelectorAll("a").length;
    const imageCount = doc.querySelectorAll("img").length;
    const formElements = doc.querySelectorAll(
      "input, select, textarea, button",
    ).length;

    return {
      textLength,
      linkCount,
      imageCount,
      formElements,
    };
  }

  private analyzeDOMComplexity(doc: Document) {
    const allElements = doc.querySelectorAll("*");
    const totalElements = allElements.length;
    const uniqueTags = new Set(
      Array.from(allElements).map((el) => el.tagName.toLowerCase()),
    ).size;

    let totalNesting = 0;
    let maxNesting = 0;

    allElements.forEach((element) => {
      const depth = this.getElementDepth(element);
      totalNesting += depth;
      maxNesting = Math.max(maxNesting, depth);
    });

    return {
      totalElements,
      uniqueTags,
      avgNestingLevel: totalElements > 0 ? totalNesting / totalElements : 0,
      maxNestingLevel: maxNesting,
    };
  }

  private extractColorPalette(html: string): string[] {
    const colorRegex =
      /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
    const colors = html.match(colorRegex) || [];
    return [...new Set(colors)].slice(0, 10);
  }

  private generateStructuralHash(html: string): string {
    const simplified = html
      .replace(/\s+/g, " ")
      .replace(/<!--.*?-->/g, "")
      .replace(/style="[^"]*"/g, "")
      .replace(/class="[^"]*"/g, "")
      .replace(/id="[^"]*"/g, "");

    return this.simpleHash(simplified);
  }

  private calculateMaxNestingDepth(element: Element | null): number {
    if (!element) return 0;

    let maxDepth = 0;
    const children = Array.from(element.children);

    children.forEach((child) => {
      const depth = this.calculateMaxNestingDepth(child);
      maxDepth = Math.max(maxDepth, depth);
    });

    return maxDepth + 1;
  }

  private getElementDepth(element: Element): number {
    let depth = 0;
    let parent = element.parentElement;

    while (parent) {
      depth++;
      parent = parent.parentElement;
    }

    return depth;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}
