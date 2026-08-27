const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', 'utf8');

// Stop the calendar click from opening the modal immediately
code = code.replace(
    'setIsAttendanceModalOpen(true);',
    '// setIsAttendanceModalOpen(true); // removed to show details below instead'
);

// Add details view below the calendar
const detailsView = `
                </Card>
              </div>
              
              {/* Selected Date Details */}
              {selectedDate && (
                <Card className="shadow-sm border-0 bg-white mt-6">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold">Details for {format(selectedDate, 'MMMM dd, yyyy')}</CardTitle>
                        <CardDescription>Punch details and selfies</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setIsAttendanceModalOpen(true)}>
                      Manual Override
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const att = currentMonthAttendances.find(a => isSameDay(new Date(a.date), selectedDate));
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
                                  <h4 className="font-semibold text-sm">Session {idx + 1}</h4>
                                  <div className="flex justify-between text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Punch In</p>
                                      <p className="font-medium">{session.clockInTime ? format(new Date(session.clockInTime), 'hh:mm a') : 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-muted-foreground">Punch Out</p>
                                      <p className="font-medium">{session.clockOutTime ? format(new Date(session.clockOutTime), 'hh:mm a') : 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Photos */}
                                  <div className="flex gap-2 mt-2">
                                    {session.clockInPhoto && (
                                      <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">In Photo</p>
                                        <img src={session.clockInPhoto} alt="Clock In" className="w-full h-24 object-cover rounded-md border" />
                                      </div>
                                    )}
                                    {session.clockOutPhoto && (
                                      <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">Out Photo</p>
                                        <img src={session.clockOutPhoto} alt="Clock Out" className="w-full h-24 object-cover rounded-md border" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No punch details recorded.</p>
                          )}
                          
                          {att.notes && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md">
                              <p className="text-xs font-semibold text-amber-800 mb-1">Admin Notes</p>
                              <p className="text-sm text-amber-900">{att.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
`;

code = code.replace('</Card>\n              </div>\n            </TabsContent>', detailsView + '\n            </TabsContent>');

fs.writeFileSync('src/app/dashboard/attendance/employees/[id]/page.tsx', code);
