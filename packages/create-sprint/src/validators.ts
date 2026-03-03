export function validateProjectName(name: string): string | null {
    if (!name.trim()) return "Please enter a project name";

    const n = name.trim();

    if (n !== n.toLowerCase()) return "Project name must be lowercase";

    if (n.length > 214) return "Project name must be less than 214 characters";

    if (n.startsWith("-") || n.startsWith(".")) return "Project name cannot start with - or .";

    if (/[~!@#$%^&*(){}[\]<>?:]/.test(n)) return "Project name cannot contain special characters (only letters, numbers, - and _)";
    
    if (n !== encodeURIComponent(n)) return "Project name must be URL-safe";
    
    const reserved = ["node_modules", "favicon.ico"];
    if (reserved.includes(n.toLowerCase())) return `Cannot use "${n}" as project name`;
    
    return null;
};