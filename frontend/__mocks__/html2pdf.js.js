// Mock for html2pdf.js in Jest tests
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockFrom = jest.fn().mockReturnValue({ save: mockSave });
const mockSet = jest.fn().mockReturnValue({ from: mockFrom });
const html2pdf = jest.fn().mockReturnValue({ set: mockSet });

html2pdf._mockSave = mockSave;
html2pdf._mockFrom = mockFrom;
html2pdf._mockSet = mockSet;

module.exports = html2pdf;
module.exports.default = html2pdf;
