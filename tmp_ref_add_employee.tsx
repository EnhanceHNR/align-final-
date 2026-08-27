
'use client';

import { useState, useContext, useTransition } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Trash2, CalendarIcon, UploadCloud, ArrowLeft, Download } from 'lucide-react';
import { AppContext } from '@/context/app-context';
import { mockOfficeLocations } from '@/app/lib/mock-data';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { STANDARD_SALARY_COMPONENTS } from '@/lib/salary-templates';
import Image from 'next/image';
import { downloadAppointmentOrder, downloadAcceptanceLetter, type LanguageOption } from '@/lib/docx-generator';


const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const shiftOptions = [
    '9:00 AM - 5:00 PM',
    '10:00 AM - 6:00 PM',
    '8:00 AM - 4:00 PM',
    '11:00 AM - 7:00 PM',
    '7:00 AM - 3:00 PM',
    'Custom',
];

const salaryComponentSchema = z.object({
  id: z.string(),
  type: z.enum(['increment', 'deduction']),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  amountType: z.enum(['percentage', 'fixed']),
  scope: z.enum(['base-adjustment', 'post-adjustment']),
  description: z.string().min(1, 'Description is required'),
  canonicalCode: z.string().optional(),
  componentType: z.enum(['standard', 'paid-leave-encashment']).optional(),
  days: z.coerce.number().min(0).optional(),
  isPermanent: z.boolean().optional(),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date().optional(),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).refine(val => val.trim().split(/\s+/).length >= 2, { message: 'Please enter full name (first & last name)' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  mobileNumber: z.string().optional(),
  dateOfBirth: z.date().optional(),
  joiningDate: z.date().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  addressProof: z.string().optional(),
  panCard: z.string().optional(),
  bankAccountDetails: z.string().optional(),
  employeeType: z.enum(['Super Admin', 'Admin', 'Employee']),
  role: z.string().min(2, { message: 'Role must be at least 2 characters.' }),
  department: z.string().min(1, { message: 'Please select a department.' }),
  shift: z.string().min(1, { message: 'Shift timings are required.' }),
  baseSalary: z.coerce.number().min(0, { message: 'Salary must be a positive number.' }),
  salaryComponents: z.array(salaryComponentSchema).optional(),
  officeLocationId: z.string().min(1, { message: 'Please select an office location.' }),
  weeklyOffs: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one weekly off.',
  }),
  bufferTime: z.coerce.number().int().min(0, { message: 'Buffer time cannot be negative.' }),
  paidLeave: z.coerce.number().int().min(0, { message: 'Paid leave must be a positive number.' }),
  sickLeave: z.coerce.number().int().min(0, { message: 'Sick leave must be a positive number.' }),
  organization: z.string().optional(),
  profilePhoto: z.any().refine((files) => files?.length === 1, 'Profile photo is required.').refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`),
  nationalId: z.any().refine((files) => files?.length === 1, 'National ID is required.').refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`),
  signedDocument: z.any().refine((files) => files?.length === 1, 'Signed document is required.').refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`),
});

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [customShiftEnabled, setCustomShiftEnabled] = useState(false);
  const [customShiftStart, setCustomShiftStart] = useState('09:00');
  const [customShiftEnd, setCustomShiftEnd] = useState('17:00');
  const { toast } = useToast();
  const { addEmployee, currentUser, organizations } = useContext(AppContext);
  const isSuperAdmin = currentUser?.employeeType === 'Super Admin';
  const [step, setStep] = useState<1 | 2>(1);
  const [docLanguage, setDocLanguage] = useState<LanguageOption>('English');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);

  const defaultLocation = mockOfficeLocations[0] || { id: 'loc1' };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
      mobileNumber: '',
      bloodGroup: '',
      address: '',
      emergencyContact: '',
      addressProof: '',
      panCard: '',
      bankAccountDetails: '',
      employeeType: 'Employee',
      role: '',
      department: '',
      shift: '9:00 AM - 5:00 PM',
      baseSalary: 50000,
      salaryComponents: [],
      officeLocationId: defaultLocation.id,
      weeklyOffs: ['Saturday', 'Sunday'],
      bufferTime: 10,
      paidLeave: 12,
      sickLeave: 5,
      organization: 'Enhance Head Neck Rehabilitation',
      profilePhoto: undefined,
      nationalId: undefined,
      signedDocument: undefined,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "salaryComponents",
  });

  const goToNextStep = async () => {
    const isValid = await form.trigger([
      'name', 'email', 'password', 'phoneNumber', 'mobileNumber', 'dateOfBirth',
      'joiningDate', 'bloodGroup', 'address', 'emergencyContact', 'addressProof',
      'panCard', 'bankAccountDetails', 'employeeType', 'role', 'department',
      'shift', 'baseSalary', 'officeLocationId', 'weeklyOffs', 'bufferTime',
      'paidLeave', 'sickLeave', 'organization'
    ]);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const parseTime = (timeStr: string): string => {
        const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/);
        if (!match) return '09:00';
        const [, hours, minutes, period] = match;
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;
        return `${hour24.toString().padStart(2, '0')}:${minutes}`;
      };
      
      const [startTime, endTime] = values.shift.split(' - ').map(parseTime);
      const shift = [{ startTime, endTime }];
      
      const employeeData = {
        name: values.name,
        email: values.email,
        password: values.password,
        phoneNumber: values.phoneNumber,
        mobileNumber: values.mobileNumber,
        bloodGroup: values.bloodGroup,
        address: values.address,
        emergencyContact: values.emergencyContact,
        addressProof: values.addressProof,
        panCard: values.panCard,
        bankAccountDetails: values.bankAccountDetails,
        employeeType: values.employeeType,
        role: values.role,
        department: values.department,
        shift,
        baseSalary: values.baseSalary,
        salaryComponents: values.salaryComponents?.map(sc => ({
            ...sc,
            startDate: format(sc.startDate, 'yyyy-MM-dd'),
            endDate: format(sc.endDate, 'yyyy-MM-dd'),
        })),
        officeLocationId: values.officeLocationId,
        weeklyOffs: values.weeklyOffs,
        bufferTime: values.bufferTime,
        paidLeave: values.paidLeave,
        sickLeave: values.sickLeave,
        organization: values.organization,
        dateOfBirth: values.dateOfBirth ? format(values.dateOfBirth, 'yyyy-MM-dd') : undefined,
        joiningDate: values.joiningDate ? format(values.joiningDate, 'yyyy-MM-dd') : undefined,
        manager: currentUser?.name ?? 'System',
      };
      
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);
      formData.append('name', values.name);
      formData.append('phoneNumber', values.phoneNumber);
      if (values.profilePhoto && values.profilePhoto.length > 0) formData.append('profilePhoto', values.profilePhoto[0]);
      if (values.nationalId && values.nationalId.length > 0) formData.append('nationalId', values.nationalId[0]);
      if (values.signedDocument && values.signedDocument.length > 0) formData.append('signedDocument', values.signedDocument[0]);
      formData.append('employeeData', JSON.stringify(employeeData));

      const result = await addEmployee(formData);

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to Add Employee',
          description: result.error,
        });
      } else {
        toast({
          title: 'Employee Added',
          description: `${values.name} has been added successfully.`,
        });
        setOpen(false);
        setStep(1);
        form.reset();
        setPhotoPreview(null);
        setIdPreview(null);
        setDocPreview(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setCustomShiftEnabled(false);
        setCustomShiftStart('09:00');
        setCustomShiftEnd('17:00');
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" /> Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Enter the basic details for the new employee.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4"
          >
            {step === 1 && (
              <>
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from(new Map(organizations.map(org => [org.name, org])).values()).map(org => (
                        <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. john.d@test.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +919876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +919876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          captionLayout="dropdown-buttons"
                          fromYear={1950}
                          toYear={new Date().getFullYear()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="joiningDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Joining</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("2000-01-01")
                          }
                          captionLayout="dropdown-buttons"
                          fromYear={2000}
                          toYear={new Date().getFullYear() + 1}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="bloodGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Group</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complete Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +919876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressProof"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Proof</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Aadhar, Voter ID, Passport" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="panCard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PAN Card Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ABCDE1234F" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAccountDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account Details</FormLabel>
                  <FormControl>
                    <Input placeholder="Bank Name, Account Number, IFSC Code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isSuperAdmin && (
                        <>
                          <SelectItem value="Super Admin">Super Admin</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </>
                      )}
                      <SelectItem value="Employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Human Resources">
                        Human Resources
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="shift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift Timings</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      if (value === 'Custom') {
                        setCustomShiftEnabled(true);
                        const formatTime = (time24: string) => {
                          if (!time24 || !time24.includes(':')) return '9:00 AM';
                          const parts = time24.split(':').map(Number);
                          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return '9:00 AM';
                          const [hours, minutes] = parts;
                          const period = hours >= 12 ? 'PM' : 'AM';
                          const hours12 = hours % 12 || 12;
                          return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
                        };
                        field.onChange(`${formatTime(customShiftStart)} - ${formatTime(customShiftEnd)}`);
                      } else {
                        setCustomShiftEnabled(false);
                        field.onChange(value);
                      }
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       {shiftOptions.map(option => (
                           <SelectItem key={option} value={option}>{option}</SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                  {customShiftEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <FormLabel className="text-xs text-muted-foreground">Start Time</FormLabel>
                        <Input
                          type="time"
                          value={customShiftStart}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setCustomShiftStart(newValue);
                            if (!newValue || !customShiftEnd) return;
                            const formatTime = (time24: string) => {
                              if (!time24 || !time24.includes(':')) return '9:00 AM';
                              const parts = time24.split(':').map(Number);
                              if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return '9:00 AM';
                              const [hours, minutes] = parts;
                              const period = hours >= 12 ? 'PM' : 'AM';
                              const hours12 = hours % 12 || 12;
                              return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
                            };
                            field.onChange(`${formatTime(newValue)} - ${formatTime(customShiftEnd)}`);
                          }}
                        />
                      </div>
                      <div>
                        <FormLabel className="text-xs text-muted-foreground">End Time</FormLabel>
                        <Input
                          type="time"
                          value={customShiftEnd}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setCustomShiftEnd(newValue);
                            if (!newValue || !customShiftStart) return;
                            const formatTime = (time24: string) => {
                              if (!time24 || !time24.includes(':')) return '9:00 AM';
                              const parts = time24.split(':').map(Number);
                              if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return '9:00 AM';
                              const [hours, minutes] = parts;
                              const period = hours >= 12 ? 'PM' : 'AM';
                              const hours12 = hours % 12 || 12;
                              return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
                            };
                            field.onChange(`${formatTime(customShiftStart)} - ${formatTime(newValue)}`);
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Salary (Monthly, INR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 80000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paidLeave"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Leave (Days)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sickLeave"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sick Leave (Days)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
             <div>
              <FormLabel>Salary Components</FormLabel>
              <FormDescription>
                Add salary components like allowances, deductions, or custom adjustments.
              </FormDescription>
              <div className="space-y-4 mt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md space-y-4 relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                     </Button>
                     
                     <FormField
                      control={form.control}
                      name={`salaryComponents.${index}.description`}
                      render={({ field: descField }) => (
                        <FormItem>
                          <FormLabel>Component Template / Description</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              const template = STANDARD_SALARY_COMPONENTS.find(t => t.code === value);
                              if (template) {
                                form.setValue(`salaryComponents.${index}.description`, template.name);
                                form.setValue(`salaryComponents.${index}.canonicalCode`, template.code);
                                form.setValue(`salaryComponents.${index}.type`, template.type);
                                form.setValue(`salaryComponents.${index}.amountType`, template.amountType);
                                form.setValue(`salaryComponents.${index}.scope`, template.scope);
                                form.setValue(`salaryComponents.${index}.amount`, template.defaultAmount);
                              } else {
                                descField.onChange(value);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select template or type custom" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="custom">Custom Component</SelectItem>
                              <Separator className="my-2" />
                              {STANDARD_SALARY_COMPONENTS.map(template => (
                                <SelectItem key={template.code} value={template.code}>
                                  {template.name} ({template.type === 'increment' ? '+' : '-'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormControl className="mt-2">
                            <Input placeholder="e.g., Performance Bonus" {...descField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                       <FormField
                          control={form.control}
                          name={`salaryComponents.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="increment">Increment</SelectItem>
                                  <SelectItem value="deduction">Deduction</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`salaryComponents.${index}.amountType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage %</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount ₹</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <FormField
                          control={form.control}
                          name={`salaryComponents.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {form.watch(`salaryComponents.${index}.amountType`) === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                              </FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`salaryComponents.${index}.scope`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Application Scope</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="base-adjustment">Adjust Base First</SelectItem>
                                  <SelectItem value="post-adjustment">Apply After</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                    
                     <Controller
                        control={form.control}
                        name={`salaryComponents.${index}`}
                        render={({ field: { value }, fieldState }) => (
                           <FormItem>
                             <FormLabel>Effective Date Range</FormLabel>
                             <Popover>
                               <PopoverTrigger asChild>
                                 <Button
                                   variant={'outline'}
                                   className={cn("w-full justify-start text-left font-normal", !value.startDate && "text-muted-foreground")}
                                 >
                                   <CalendarIcon className="mr-2 h-4 w-4" />
                                   {value.startDate && value.endDate ? (
                                     <>{format(value.startDate, "LLL dd, y")} - {format(value.endDate, "LLL dd, y")}</>
                                   ) : (
                                     <span>Pick a date range</span>
                                   )}
                                 </Button>
                               </PopoverTrigger>
                               <PopoverContent className="w-auto p-0" align="start">
                                 <Calendar
                                   initialFocus
                                   mode="range"
                                   defaultMonth={value.startDate}
                                   selected={{ from: value.startDate, to: value.endDate }}
                                   onSelect={(range) => {
                                      if(range?.from) {
                                         form.setValue(`salaryComponents.${index}.startDate`, range.from);
                                         form.setValue(`salaryComponents.${index}.endDate`, range.to || range.from);
                                      }
                                   }}
                                   numberOfMonths={2}
                                 />
                               </PopoverContent>
                             </Popover>
                             <FormMessage />
                           </FormItem>
                        )}
                     />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ 
                    id: crypto.randomUUID(), 
                    type: 'increment', 
                    amount: 0, 
                    amountType: 'percentage',
                    scope: 'post-adjustment',
                    description: '', 
                    startDate: new Date(), 
                    endDate: new Date() 
                  })}
                >
                  <PlusCircle className="mr-2" /> Add Salary Component
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <FormField
              control={form.control}
              name="bufferTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Late Punch-in Buffer (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 15" {...field} />
                  </FormControl>
                   <FormDescription>
                     Grace period before an employee is marked as late.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="weeklyOffs"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Weekly Offs</FormLabel>
                    <FormDescription>
                      Select the days the employee has off each week.
                    </FormDescription>
                  </div>
                  <div className="flex flex-wrap gap-4">
                  {daysOfWeek.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="weeklyOffs"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-start space-x-2 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
              </>
            )}

            {step === 2 && (
              <>
                <div className="mb-6 space-y-4 rounded-lg border p-4 bg-muted/50">
                   <h3 className="text-lg font-medium">1. Download Offer Letter</h3>
                   <p className="text-sm text-muted-foreground">Select language and download the documents for the employee to sign.</p>
                   
                   <div className="flex flex-col sm:flex-row gap-4 items-end">
                       <div className="space-y-2 flex-1">
                          <FormLabel>Document Language</FormLabel>
                          <Select value={docLanguage} onValueChange={(val: any) => setDocLanguage(val)}>
                              <SelectTrigger>
                                 <SelectValue placeholder="Select Language" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="English">English</SelectItem>
                                 <SelectItem value="Marathi">Marathi</SelectItem>
                              </SelectContent>
                          </Select>
                       </div>
                       <Button type="button" variant="outline" onClick={() => { 
                           const employeeData = form.getValues();
                           
                           const parseTime = (timeStr: string): string => {
                               try {
                                   const parsed = parse(timeStr, 'h:mm a', new Date());
                                   return format(parsed, 'HH:mm');
                               } catch {
                                   return timeStr;
                               }
                           };
                           const [startTime, endTime] = (employeeData.shift || "09:00 AM - 05:00 PM").split(' - ').map(parseTime);

                           // We mock an employee object for document generation
                           const mockEmp: any = {
                               ...employeeData,
                               joiningDate: employeeData.joiningDate ? format(employeeData.joiningDate, 'yyyy-MM-dd') : undefined,
                               shift: [{ startTime, endTime }],
                           };
                           downloadAppointmentOrder(mockEmp, docLanguage); 
                           downloadAcceptanceLetter(mockEmp); 
                       }}>
                           <Download className="mr-2 h-4 w-4" /> Download Documents
                       </Button>
                   </div>
                </div>

                <div className="mb-2">
                    <h3 className="text-lg font-medium flex items-center">
                      2. Upload Signed Documents & ID
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                      control={form.control}
                      name="profilePhoto"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Profile Photo</FormLabel>
                          <FormControl>
                              <div className="relative flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                              {photoPreview ? (
                                  <Image src={photoPreview} alt="Profile preview" layout="fill" objectFit="cover" className="rounded-lg"/>
                              ) : (
                                  <div className="text-center p-4">
                                      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground"/>
                                      <p className="mt-2 text-sm text-muted-foreground">Click to upload</p>
                                  </div>
                              )}
                              <Input 
                                  type="file" 
                                  accept="image/*"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                          field.onChange(e.target.files);
                                          setPhotoPreview(URL.createObjectURL(e.target.files[0]));
                                      }
                                  }}
                              />
                              </div>
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="nationalId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>National ID</FormLabel>
                          <FormControl>
                              <div className="relative flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                               {idPreview ? (
                                  <Image src={idPreview} alt="ID preview" layout="fill" objectFit="contain" className="rounded-lg p-2"/>
                              ) : (
                                  <div className="text-center p-4">
                                      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground"/>
                                      <p className="mt-2 text-sm text-muted-foreground">Click to upload</p>
                                  </div>
                              )}
                              <Input   
                                  type="file" 
                                  accept="image/*,application/pdf"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                          field.onChange(e.target.files);
                                          const file = e.target.files[0];
                                          if (file.type.startsWith('image/')) {
                                              setIdPreview(URL.createObjectURL(file));
                                          } else {
                                              setIdPreview(null);
                                          }
                                      }
                                  }}
                              />
                              </div>
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="signedDocument"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Signed Document</FormLabel>
                          <FormControl>
                              <div className="relative flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                               {docPreview ? (
                                  <Image src={docPreview} alt="Document preview" layout="fill" objectFit="contain" className="rounded-lg p-2"/>
                              ) : (
                                  <div className="text-center p-4">
                                      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground"/>
                                      <p className="mt-2 text-sm text-muted-foreground">Click to upload</p>
                                  </div>
                              )}
                              <Input 
                                  type="file" 
                                  accept="image/*,application/pdf"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                          field.onChange(e.target.files);
                                           const file = e.target.files[0];
                                          if (file.type.startsWith('image/')) {
                                              setDocPreview(URL.createObjectURL(file));
                                          } else {
                                              setDocPreview(null);
                                          }
                                      }
                                  }}
                              />
                              </div>
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>
              </>
            )}
            
            <DialogFooter className='pt-4 flex justify-between'>
              {step === 2 && (
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              {step === 1 ? (
                <Button type="button" onClick={goToNextStep} className="ml-auto">
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isPending} className="ml-auto">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Employee
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
