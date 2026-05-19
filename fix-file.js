import fs from 'fs';

const filePath = 'src/components/views/ExamDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The broken section looks like:
//                             <div className="flex items-start justify-between gap-4">
//                               <p className="font-bold text-gray-800 leading-relaxed">{q.text}</p>
//                             </div>
//                                   <AlertTriangle className="w-4 h-4" />
//                                 </div>
//                               )}
//                             </div>

const brokenPattern = /<div className="flex items-start justify-between gap-4">\s*<p className="font-bold text-gray-800 leading-relaxed">\{q\.text\}<\/p>\s*<\/div>[\s\S]*?<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">/;

const fixedSection = `<div className="flex items-start justify-between gap-4">
                              <p className="font-bold text-gray-800 leading-relaxed">{q.text}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">`;

content = content.replace(brokenPattern, fixedSection);

// Also fix the map types if any HemisParsedQuestion remains
content = content.replace(/q: HemisParsedQuestion/g, 'q: any');

fs.writeFileSync(filePath, content);
console.log('Fixed ExamDashboard.tsx');
