/**
 * Built-in sample datasets across multiple business formats (CSV, JSON, TSV)
 * Allows users to test the application immediately with 1 click.
 */

export interface SampleDatasetPreset {
  id: string;
  title: string;
  format: 'csv' | 'json' | 'tsv';
  description: string;
  rowCount: number;
  columnCount: number;
  content: string;
  fileName: string;
}

export const SAMPLE_DATASETS: SampleDatasetPreset[] = [
  {
    id: 'ecommerce-sales',
    title: 'E-Commerce Sales & Profitability',
    format: 'csv',
    description: 'Retail transactions across product categories, customer segments, sales revenue, discount, and profit.',
    rowCount: 25,
    columnCount: 9,
    fileName: 'ecommerce_sales_sample.csv',
    content: `OrderID,OrderDate,Region,CustomerSegment,Category,SubCategory,Sales,Profit,Discount
ORD-1001,2024-01-05,West,Corporate,Technology,Phones,899.99,180.50,0.05
ORD-1002,2024-01-07,East,Consumer,Furniture,Chairs,249.50,35.20,0.10
ORD-1003,2024-01-10,Central,Home Office,Office Supplies,Binders,45.20,12.80,0.00
ORD-1004,2024-01-12,South,Corporate,Technology,Accessories,185.00,42.00,0.00
ORD-1005,2024-01-15,West,Consumer,Furniture,Tables,650.00,-45.00,0.20
ORD-1006,2024-01-18,East,Corporate,Office Supplies,Paper,32.40,9.10,0.00
ORD-1007,2024-01-20,West,Consumer,Technology,Laptops,1450.00,320.00,0.05
ORD-1008,2024-01-22,Central,Corporate,Furniture,Bookcases,380.00,55.00,0.15
ORD-1009,2024-01-25,South,Consumer,Office Supplies,Storage,112.50,22.40,0.00
ORD-1010,2024-01-28,East,Home Office,Technology,Phones,620.00,95.00,0.10
ORD-1011,2024-02-01,West,Corporate,Office Supplies,Appliances,490.00,88.50,0.00
ORD-1012,2024-02-03,Central,Consumer,Furniture,Chairs,199.00,28.00,0.05
ORD-1013,2024-02-06,South,Corporate,Technology,Machines,1150.00,190.00,0.10
ORD-1014,2024-02-09,East,Consumer,Office Supplies,Art,28.50,8.20,0.00
ORD-1015,2024-02-12,West,Home Office,Furniture,Tables,720.00,110.00,0.05
ORD-1016,2024-02-15,Central,Corporate,Technology,Phones,950.00,210.00,0.00
ORD-1017,2024-02-18,South,Consumer,Office Supplies,Binders,58.00,16.50,0.00
ORD-1018,2024-02-21,East,Corporate,Furniture,Chairs,310.00,48.00,0.10
ORD-1019,2024-02-24,West,Consumer,Technology,Accessories,95.00,24.00,0.00
ORD-1020,2024-02-27,Central,Home Office,Office Supplies,Storage,140.00,31.50,0.00
ORD-1021,2024-03-01,East,Consumer,Technology,Laptops,1680.00,380.00,0.05
ORD-1022,2024-03-04,South,Corporate,Furniture,Bookcases,420.00,62.00,0.10
ORD-1023,2024-03-07,West,Consumer,Office Supplies,Paper,45.00,12.00,0.00
ORD-1024,2024-03-10,Central,Corporate,Technology,Machines,1280.00,230.00,0.15
ORD-1025,2024-03-14,East,Home Office,Office Supplies,Appliances,530.00,94.00,0.05`,
  },
  {
    id: 'saas-metrics',
    title: 'SaaS ARR & Customer Health',
    format: 'json',
    description: 'B2B subscription metrics tracking Monthly Recurring Revenue (MRR), seats, NPS, and churn risk.',
    rowCount: 20,
    columnCount: 8,
    fileName: 'saas_accounts_sample.json',
    content: JSON.stringify(
      [
        { Account: 'Acme Corp', Plan: 'Enterprise', MRR: 4500, Users: 120, NPS: 9, SupportTickets: 1, ChurnRisk: 'Low', Industry: 'FinTech' },
        { Account: 'Starlight Media', Plan: 'Pro', MRR: 1200, Users: 35, NPS: 8, SupportTickets: 3, ChurnRisk: 'Low', Industry: 'Media' },
        { Account: 'Apex Logistics', Plan: 'Enterprise', MRR: 5800, Users: 210, NPS: 6, SupportTickets: 7, ChurnRisk: 'Medium', Industry: 'Logistics' },
        { Account: 'BioHealth Labs', Plan: 'Pro', MRR: 1500, Users: 40, NPS: 9, SupportTickets: 2, ChurnRisk: 'Low', Industry: 'Healthcare' },
        { Account: 'CloudByte Systems', Plan: 'Starter', MRR: 490, Users: 10, NPS: 5, SupportTickets: 4, ChurnRisk: 'High', Industry: 'Tech' },
        { Account: 'Vanguard Retail', Plan: 'Enterprise', MRR: 7200, Users: 350, NPS: 8, SupportTickets: 2, ChurnRisk: 'Low', Industry: 'Retail' },
        { Account: 'Nexus Energy', Plan: 'Pro', MRR: 1800, Users: 55, NPS: 7, SupportTickets: 5, ChurnRisk: 'Medium', Industry: 'Energy' },
        { Account: 'Zenith Payments', Plan: 'Enterprise', MRR: 6400, Users: 190, NPS: 9, SupportTickets: 1, ChurnRisk: 'Low', Industry: 'FinTech' },
        { Account: 'OmniTrade Global', Plan: 'Starter', MRR: 350, Users: 8, NPS: 4, SupportTickets: 6, ChurnRisk: 'High', Industry: 'Retail' },
        { Account: 'Skyline Architects', Plan: 'Pro', MRR: 1100, Users: 25, NPS: 8, SupportTickets: 2, ChurnRisk: 'Low', Industry: 'Real Estate' },
        { Account: 'Prism AI Solutions', Plan: 'Enterprise', MRR: 8100, Users: 400, NPS: 10, SupportTickets: 3, ChurnRisk: 'Low', Industry: 'Tech' },
        { Account: 'Cascade Health', Plan: 'Pro', MRR: 1650, Users: 48, NPS: 7, SupportTickets: 4, ChurnRisk: 'Medium', Industry: 'Healthcare' },
        { Account: 'Silverline Cargo', Plan: 'Starter', MRR: 420, Users: 12, NPS: 6, SupportTickets: 3, ChurnRisk: 'Medium', Industry: 'Logistics' },
        { Account: 'Atlas Robotics', Plan: 'Enterprise', MRR: 9200, Users: 480, NPS: 9, SupportTickets: 2, ChurnRisk: 'Low', Industry: 'Manufacturing' },
        { Account: 'Beacon Marketing', Plan: 'Pro', MRR: 1350, Users: 30, NPS: 8, SupportTickets: 1, ChurnRisk: 'Low', Industry: 'Media' },
        { Account: 'Summit Financial', Plan: 'Enterprise', MRR: 5200, Users: 160, NPS: 8, SupportTickets: 2, ChurnRisk: 'Low', Industry: 'FinTech' },
        { Account: 'Vertex Education', Plan: 'Starter', MRR: 290, Users: 6, NPS: 5, SupportTickets: 5, ChurnRisk: 'High', Industry: 'Education' },
        { Account: 'Horizon Biotech', Plan: 'Pro', MRR: 2100, Users: 65, NPS: 9, SupportTickets: 1, ChurnRisk: 'Low', Industry: 'Healthcare' },
        { Account: 'Pinnacle Freight', Plan: 'Pro', MRR: 1750, Users: 50, NPS: 6, SupportTickets: 6, ChurnRisk: 'Medium', Industry: 'Logistics' },
        { Account: 'Nova Capital', Plan: 'Enterprise', MRR: 7800, Users: 320, NPS: 9, SupportTickets: 0, ChurnRisk: 'Low', Industry: 'FinTech' },
      ],
      null,
      2
    ),
  },
  {
    id: 'hr-workforce',
    title: 'Workforce Salary & Performance (TSV)',
    format: 'tsv',
    description: 'Human resources data analyzing departmental compensation, experience, performance ratings, and work style.',
    rowCount: 20,
    columnCount: 7,
    fileName: 'hr_workforce_sample.tsv',
    content: `EmployeeID\tDepartment\tJobTitle\tExperienceYears\tSalary\tPerformanceRating\tWorkModel
EMP-201\tEngineering\tSenior Backend Engineer\t8\t135000\t4.8\tRemote
EMP-202\tSales\tAccount Executive\t4\t88000\t4.2\tHybrid
EMP-203\tProduct\tProduct Manager\t6\t120000\t4.6\tHybrid
EMP-204\tEngineering\tFrontend Engineer\t3\t95000\t4.1\tRemote
EMP-205\tMarketing\tGrowth Lead\t5\t102000\t4.5\tHybrid
EMP-206\tSales\tSales Director\t11\t175000\t4.9\tOn-Site
EMP-207\tOperations\tHR Specialist\t3\t68000\t3.9\tHybrid
EMP-208\tEngineering\tStaff Engineer\t12\t185000\t5.0\tRemote
EMP-209\tProduct\tUI/UX Designer\t4\t92000\t4.4\tRemote
EMP-210\tMarketing\tContent Strategist\t2\t62000\t3.8\tHybrid
EMP-211\tEngineering\tDevOps Engineer\t7\t130000\t4.7\tRemote
EMP-212\tSales\tBDR Representative\t1\t54000\t3.7\tOn-Site
EMP-213\tOperations\tFinance Analyst\t5\t85000\t4.3\tHybrid
EMP-214\tEngineering\tData Engineer\t6\t128000\t4.6\tRemote
EMP-215\tProduct\tGroup PM\t10\t165000\t4.8\tHybrid
EMP-216\tSales\tSenior AE\t6\t115000\t4.4\tHybrid
EMP-217\tMarketing\tSEO Manager\t4\t78000\t4.0\tRemote
EMP-218\tEngineering\tQA Automation Lead\t5\t108000\t4.2\tRemote
EMP-219\tOperations\tCustomer Support Lead\t4\t72000\t4.1\tRemote
EMP-220\tEngineering\tEngineering Manager\t9\t160000\t4.9\tHybrid`,
  },
  {
    id: 'messy-customer-orders',
    title: 'Raw Customer Orders (Needs Cleaning)',
    format: 'csv',
    description: 'Realistic raw data with duplicate rows, missing values, inconsistent casing, extra spaces, and extreme outliers.',
    rowCount: 24,
    columnCount: 8,
    fileName: 'raw_customer_orders_needs_cleaning.csv',
    content: `OrderID,OrderDate,CustomerName,Region,Segment,Category,Sales,Quantity
ORD-901,2024-01-05, Acme Corp ,East,Consumer,Technology,450.00,2
ORD-902,2024/01/08,Global Logistics,West,corporate,Furniture,1250.00,4
ORD-903,2024-01-12,Zenith Retail,Central,Consumer,Office Supplies,,1
ORD-904,2024-01-15,  Pinnacle Media  ,South,Home Office,Technology,320.00,
ORD-905,2024-01-18,Acme Corp,East,consumer,Technology,450.00,2
ORD-906,2024/01/22,BlueSky Tech,West,Corporate,Furniture,890.00,3
ORD-907,2024-01-25,Apex Health,East,Consumer,Technology,95000.00,25
ORD-908,2024-01-28,Summit Labs,Central,Corporate,Office Supplies,75.00,5
ORD-909,2024/02/02,Zenith Retail,Central,Consumer,Office Supplies,140.00,2
ORD-910,2024-02-05,Starlight Ltd,West,home office,Technology,620.00,2
ORD-901,2024-01-05, Acme Corp ,East,Consumer,Technology,450.00,2
ORD-911,2024-02-09,Vanguard Goods,South,Corporate,Furniture,540.00,1
ORD-912,2024/02/14,Omni Corp,East,Consumer,Office Supplies,,3
ORD-913,2024-02-18,Nova Digital,West,Corporate,Technology,1800.00,6
ORD-914,2024-02-21,Starlight Ltd,West,Home Office,Technology,620.00,2
ORD-915,2024/02/25,BioPharma Inc,Central,Corporate,Office Supplies,210.00,4
ORD-916,2024-03-01,Atlas Systems,North,Consumer,Technology,1420.00,
ORD-917,2024-03-04,Global Logistics,West,Corporate,Furniture,1250.00,4
ORD-918,2024/03/08,Acme Corp,East,CONSUMER,Technology,450.00,2
ORD-919,2024-03-12,Horizon Retail,South,Consumer,Office Supplies,95.00,2
ORD-920,2024-03-15,Pinnacle Media,South,Home Office,Technology,320.00,1
ORD-921,2024/03/19,Summit Labs,Central,Corporate,Office Supplies,75.00,5
ORD-922,2024-03-22,Apex Health,East,Consumer,Technology,880.00,2
ORD-901,2024-01-05, Acme Corp ,East,Consumer,Technology,450.00,2`,
  },
];
