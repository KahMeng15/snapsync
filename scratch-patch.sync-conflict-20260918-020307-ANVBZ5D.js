const fs = require('fs');
let code = fs.readFileSync('snapsync-server/src/routes/admin.ts', 'utf8');
code = code.replace(
  /router\.get\('\/settings\/email-defaults', requireRole\('admin'\), \(req: Request, res: Response\) => \{\n\s*try \{\n\s*res\.json\(\{\n\s*\.\.\.getGlobalEmailDefaults\(\),\n\s*builtInSubject: BUILT_IN_SUBJECT,\n\s*builtInBody: BUILT_IN_BODY\n\s*\}\)\n\s*\} catch \(error: any\) \{\n\s*res\.status\(500\)\.json\(\{ error: error\.message \}\)\n\s*\}\n\}\)/,
  `router.get('/settings/email-defaults', requireRole('admin'), (req: Request, res: Response) => {
  try {
    res.json({
      ...getGlobalEmailDefaults(),
      builtInSubject: BUILT_IN_SUBJECT,
      builtInBody: BUILT_IN_BODY
    })
  } catch (error: any) {
    console.error("EMAIL DEFAULTS ERROR:", error);
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})`
);
fs.writeFileSync('snapsync-server/src/routes/admin.ts', code);
