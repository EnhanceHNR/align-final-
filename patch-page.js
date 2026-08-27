const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/page.tsx', 'utf8');

code = code.replace(
    'const { data: profile, isLoading: isLoadingProfile } = api.employee.getProfile.useQuery(',
    `const { data: profile, isLoading: isLoadingProfile } = api.employee.getProfile.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );

  const { data: employeeDetails } = api.employee.getEmployeeDetails.useQuery(
    { employeeProfileId: profile?.id as string },
    { enabled: !!profile?.id }
  );

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const currentMonthAttendances = employeeDetails?.attendances?.filter((a: any) => isSameMonth(new Date(a.date), currentMonth)) || [];

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));

  // Hide the duplicate profile query definition since I've replaced it manually:
  const _discard_ = `
);
// And also I need to add isSameMonth import!
code = code.replace(
    'isSameDay, isToday } from "date-fns";',
    'isSameDay, isToday, isSameMonth } from "date-fns";'
);

// We replace the placeholder CardContent with the actual calendar!
const calendarUI = `
                <CardContent className="pt-6">
                  <div className="flex justify-center">
                    <div className="w-full max-w-sm">
                      <div className="flex items-center justify-between p-4">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5" /></Button>
                        <h3 className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-5 w-5" /></Button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 px-2 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className="text-xs font-medium text-muted-foreground">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2 px-2">
                        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                          <div key={\`empty-\${i}\`} className="h-8 w-8"></div>
                        ))}
                        {daysInMonth.map(day => {
                          let bgColor = "bg-transparent hover:bg-slate-100";
                          let textColor = "text-slate-700";
                          
                          const attendanceRecord = currentMonthAttendances.find((a: any) => isSameDay(new Date(a.date), day));
                          
                          if (attendanceRecord) {
                              if (attendanceRecord.status === "Present") {
                                 bgColor = "bg-emerald-100";
                                 textColor = "text-emerald-700";
                              } else if (attendanceRecord.status === "Absent") {
                                 bgColor = "bg-red-200";
                                 textColor = "text-red-700";
                              } else if (attendanceRecord.status === "Late" || attendanceRecord.status === "Double Late") {
                                 bgColor = "bg-amber-700";
                                 textColor = "text-white";
                              } else if (attendanceRecord.status === "Grace Period") {
                                 bgColor = "bg-yellow-400";
                                 textColor = "text-yellow-900";
                              } else if (attendanceRecord.status.includes("Leave")) {
                                 bgColor = "bg-amber-100";
                                 textColor = "text-amber-700";
                              } else if (attendanceRecord.status === "Holiday" || attendanceRecord.status === "Weekend") {
                                 bgColor = "bg-slate-100";
                                 textColor = "text-slate-400";
                              }
                          }

                          return (
                            <div key={day.toISOString()} className="flex justify-center items-center">
                              <div 
                                 onClick={() => setSelectedDate(day)}
                                 className={\`h-8 w-8 flex items-center justify-center rounded-sm text-sm cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all \${bgColor} \${textColor} \${isToday(day) ? 'ring-2 ring-slate-400' : ''}\`}>
                                {day.getDate()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Selected Date Details */}
                  {selectedDate && (
                    <div className="mt-6 border-t pt-6">
                        <h4 className="font-semibold mb-2">Details for {format(selectedDate, 'MMMM dd, yyyy')}</h4>
                        {(() => {
                          const att = currentMonthAttendances.find((a: any) => isSameDay(new Date(a.date), selectedDate));
                          if (!att) return <p className="text-sm text-muted-foreground">No attendance record for this date.</p>;
                          
                          return (
                            <div className="space-y-4">
                              <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-slate-100">
                                Status: <span className="font-bold">{att.status}</span>
                              </div>
                              
                              {att.sessions && att.sessions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {att.sessions.map((session: any, idx: number) => (
                                    <div key={session.id} className="border rounded-lg p-4 bg-slate-50 space-y-3">
                                      <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Session {idx + 1}</h5>
                                      <div className="flex justify-between text-sm">
                                        <div>
                                          <p className="text-muted-foreground">Punch In</p>
                                          <p className="font-medium">{session.clockInTime ? safeFormat(session.clockInTime, 'hh:mm a') : 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-muted-foreground">Punch Out</p>
                                          <p className="font-medium">{session.clockOutTime ? safeFormat(session.clockOutTime, 'hh:mm a') : 'N/A'}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2 mt-2">
                                        {session.clockInPhoto && (
                                          <div className="flex-1">
                                            <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">In Photo</p>
                                            <img src={session.clockInPhoto} alt="Clock In" className="w-full h-20 object-cover rounded border border-slate-200" />
                                          </div>
                                        )}
                                        {session.clockOutPhoto && (
                                          <div className="flex-1">
                                            <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Out Photo</p>
                                            <img src={session.clockOutPhoto} alt="Clock Out" className="w-full h-20 object-cover rounded border border-slate-200" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No punch details recorded.</p>
                              )}
                            </div>
                          );
                        })()}
                    </div>
                  )}
                </CardContent>
`;

code = code.replace(
    /<CardContent className="h-64 flex items-center justify-center border-dashed border-2 m-6 rounded-xl text-muted-foreground">\s*Calendar view will be integrated soon.\s*<\/CardContent>/,
    calendarUI
);

// We need to carefully replace the old profile fetch because `const _discard_ = ` strategy breaks.
code = code.replace(
    /const _discard_ = `[\s\S]*?\);/,
    ''
);

fs.writeFileSync('src/app/dashboard/attendance/page.tsx', code);
